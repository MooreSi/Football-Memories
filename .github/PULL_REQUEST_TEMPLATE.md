## What and why

## What must NOT change (and didn't)

## Tests

- [ ] Tests written first and seen failing for the expected reason
- [ ] Every green "zero offenders" assertion has a negative control
- [ ] Suite green: <paste numbers>

## Safety

- [ ] No credential, cookie or token in the diff, a log or a fixture
- [ ] Nothing on Hudl is modified by this code or its tests
- [ ] No existing library file is deleted or overwritten
- [ ] Sensitive surface touched? no / yes: `/safe-change` followed
- [ ] Real-account check: not needed / done by owner (read-only) / not done
