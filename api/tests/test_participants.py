"""Participants (GLOSSARY.md): the people a job seeker meets in each Interview, stored per Application and
deleted once no Interview has them."""

import psycopg
from psycopg import sql

from tests.conftest import TEST_SCHEMA
from tests.test_interviews import FUTURE, add, create_application, reread


def query(settings, statement, params=()):
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        return conn.execute(statement, params).fetchall()


def people(interview):
    return [(p["role"], p["name"]) for p in interview["participants"]]


def url(app, interview=None):
    base = f"/applications/{app['id']}/interviews"
    return f"{base}/{interview['id']}" if interview else base


def stored(settings):
    return sorted(row[0] for row in query(settings, "select role from participants"))


# Adding and reading


def test_an_interview_keeps_its_participants_in_the_order_given(client, token):
    app = create_application(client, token())
    interview = add(
        client,
        token(),
        app,
        participants=[{"role": " Sr Director, Product ", "name": "Dana Lee"}, {"role": "EM", "name": " "}],
    )
    assert people(interview) == [("Sr Director, Product", "Dana Lee"), ("EM", None)]
    assert people(reread(client, token(), app)["interviews"][0]) == people(interview)
    assert people(client.get(url(app), headers=token()).json()[0]) == people(interview)


def test_adding_an_interview_needs_a_participant(client, token):
    app = create_application(client, token())
    body = {"category": "technical", "title": "Technical", "at": FUTURE.isoformat()}
    assert client.post(url(app), json=body, headers=token()).status_code == 422
    assert client.post(url(app), json=body | {"participants": []}, headers=token()).status_code == 422
    assert reread(client, token(), app)["interviews"] == []


def test_a_participant_can_be_in_several_interviews_of_an_application(client, token):
    app = create_application(client, token())
    first = add(client, token(), app, participants=[{"role": "Recruiter", "name": "Dana Lee"}])
    dana = first["participants"][0]
    second = add(
        client, token(), app, at=FUTURE, participants=[{"id": dana["id"], "role": "Recruiter"}, {"role": "EM"}]
    )
    assert second["participants"][0]["id"] == dana["id"]
    # Sending her role without her name clears the name, on every Interview she is in.
    assert [i["participants"][0] for i in reread(client, token(), app)["interviews"]] == [
        {"id": dana["id"], "role": "Recruiter", "name": None}
    ] * 2


def test_editing_a_participant_changes_them_on_every_interview(client, token):
    app = create_application(client, token())
    first = add(client, token(), app, participants=[{"role": "Recruiter", "name": "Dana"}])
    dana = first["participants"][0]
    second = add(
        client, token(), app, at=FUTURE, participants=[{"id": dana["id"], "role": "Recruiter", "name": "Dana"}]
    )

    renamed = [{"id": dana["id"], "role": "Talent Partner", "name": "Dana Lee"}]
    res = client.patch(url(app, second), json={"participants": renamed}, headers=token())
    assert res.status_code == 200, res.text
    assert people(res.json()) == [("Talent Partner", "Dana Lee")]
    assert [people(i) for i in reread(client, token(), app)["interviews"]] == [[("Talent Partner", "Dana Lee")]] * 2


def test_a_patch_without_participants_leaves_them(client, token):
    app = create_application(client, token())
    interview = add(client, token(), app, participants=[{"role": "EM"}])
    res = client.patch(url(app, interview), json={"title": "Onsite"}, headers=token())
    assert res.status_code == 200 and people(res.json()) == [("EM", None)]


def test_a_patch_cannot_empty_or_clear_the_participants(client, token):
    app = create_application(client, token())
    interview = add(client, token(), app)
    for participants in ([], None):
        res = client.patch(url(app, interview), json={"participants": participants}, headers=token())
        assert res.status_code == 422
    assert people(reread(client, token(), app)["interviews"][0]) == [("Recruiter", None)]


def test_a_participant_must_be_the_applications_own(client, token):
    app = create_application(client, token())
    other = create_application(client, token(), company="Other")
    theirs = add(client, token(), other, participants=[{"role": "CTO"}])["participants"][0]
    bobs_app = create_application(client, token("bob"), company="Bob's")
    bobs = add(client, token("bob"), bobs_app, participants=[{"role": "CEO"}])["participants"][0]
    interview = add(client, token(), app)

    for participant in (theirs, bobs, {"id": "6f1d8a4e-2b7c-4a7e-9a35-0c4d2f1e8b90", "role": "EM"}):
        body = {"category": "technical", "title": "Technical", "at": FUTURE.isoformat(), "participants": [participant]}
        assert client.post(url(app), json=body, headers=token()).status_code == 422
        res = client.patch(url(app, interview), json={"participants": [participant]}, headers=token())
        assert res.status_code == 422
        assert "isn't on this Application" in res.json()["detail"]
    # Nothing changed: not the Interview, nor the Participants elsewhere.
    assert people(reread(client, token(), app)["interviews"][0]) == [("Recruiter", None)]
    assert len(reread(client, token(), app)["interviews"]) == 1
    assert people(reread(client, token("bob"), bobs_app)["interviews"][0]) == [("CEO", None)]


def test_an_interview_from_before_participants_has_none(settings, client, token):
    app = create_application(client, token())
    interview = add(client, token(), app)
    query(settings, "delete from interview_participants returning 1")
    assert reread(client, token(), app)["interviews"][0]["participants"] == []
    # Other edits still work without adding any.
    res = client.patch(url(app, interview), json={"how_it_went": "Fine"}, headers=token())
    assert res.status_code == 200 and res.json()["participants"] == []


# Deleting: a Participant left in no Interview is removed


def test_removing_someone_from_an_interview_deletes_them_when_no_interview_has_them(settings, client, token):
    app = create_application(client, token())
    first = add(client, token(), app, participants=[{"role": "Recruiter"}, {"role": "EM"}])
    recruiter, em = first["participants"]
    add(client, token(), app, at=FUTURE, participants=[{"id": em["id"], "role": "EM"}])

    res = client.patch(
        url(app, first), json={"participants": [{"id": recruiter["id"], "role": "Recruiter"}]}, headers=token()
    )
    assert res.status_code == 200, res.text
    # The EM is still in the second Interview, so they stay.
    assert stored(settings) == ["EM", "Recruiter"]

    res = client.patch(url(app, first), json={"participants": [{"role": "CTO"}]}, headers=token())
    assert res.status_code == 200, res.text
    assert stored(settings) == ["CTO", "EM"]


def test_deleting_an_interview_deletes_participants_in_no_other(settings, client, token):
    app = create_application(client, token())
    first = add(client, token(), app, participants=[{"role": "Recruiter"}, {"role": "EM"}])
    em = first["participants"][1]
    add(client, token(), app, at=FUTURE, participants=[{"id": em["id"], "role": "EM"}])

    assert client.delete(url(app, first), headers=token()).status_code == 204
    assert stored(settings) == ["EM"]
    assert query(settings, "select count(*) from interview_participants") == [(1,)]


def test_deleting_an_application_deletes_its_participants(settings, client, token):
    app = create_application(client, token())
    add(client, token(), app, participants=[{"role": "Recruiter"}])
    kept = create_application(client, token(), company="Kept")
    add(client, token(), kept, participants=[{"role": "EM"}])

    assert client.delete(f"/applications/{app['id']}", headers=token()).status_code == 204
    assert stored(settings) == ["EM"]


def test_deleting_the_account_deletes_only_its_participants(settings, client, token):
    for job_seeker, role in (("alice", "Recruiter"), ("bob", "EM")):
        app = create_application(client, token(job_seeker), company=f"{job_seeker}'s")
        add(client, token(job_seeker), app, participants=[{"role": role}])

    assert client.delete("/me", headers=token("alice")).status_code == 204

    assert stored(settings) == ["EM"]
    assert query(settings, "select count(*) from interview_participants") == [(1,)]
