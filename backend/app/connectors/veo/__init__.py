"""Spec 250: the Veo connection (owner decision 006, D-035).

`_client` is the only module here that talks to Veo or imports Playwright.
`_parse` turns Veo's JSON into the helper's library items; `_connection` runs
test and refresh on one worker; `_routes` adds the helper's /veo routes.
"""
