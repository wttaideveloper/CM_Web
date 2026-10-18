# Group Chat Phase 2B Dependencies

Phase 2B implements the frontend invitation review flow using the existing
Group Chat APIs. The frontend does not bypass authorization, infer identities,
or add backend capabilities that are not present in the response contract.

## Confirmed scope

- Received invitations are loaded from `GET /groups/invitations`.
- Invitation details are loaded from `GET /groups/invitations/{invitation_id}`.
- Accept uses the separately returned `group_id` with
  `POST /groups/{group_id}/accept` and `{ consent: true }`. An optional
  display name is sent only when the user provides one.
- Decline uses the separately returned `group_id` with
  `POST /groups/{group_id}/decline` after explicit confirmation.
- If an invitation response does not provide both an invitation identifier
  and a group identifier, the frontend treats it as invalid rather than
  substituting one identifier for the other.
- Group messaging and Group Socket.IO remain unavailable until their backend
  contracts are integrated.

## Pending backend dependencies

The following questions remain outside Phase 2B and must be answered by the
backend/API owners before expanding the UI:

- Whether Provider verification is a separate prerequisite for invitation
  receipt or acceptance. The frontend does not call a verification endpoint or
  bypass a rejected Provider authorization response.
- Whether one learner may belong to multiple Groups for the same Training.
- Whether pending invitee names are authorized and which response field is the
  privacy-safe source. The frontend does not cross-match names from another
  endpoint.
- Whether Group avatar uploads are supported, including endpoint, ownership,
  and permitted media fields.
- Whether a closed Group can be reopened, including the endpoint, payload,
  eligibility, and audit behavior.
- Which roles may manage members, edit Group details, change posting settings,
  close/reopen Groups, and review invitations. The frontend uses server
  responses and does not invent permissions.

These dependencies are documented only; Phase 2B does not implement or
simulate any of them.
