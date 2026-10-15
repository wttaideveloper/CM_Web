# Experimental Empty Event Form

## Status

Temporarily disabled and removed from the active Event Form Configuration
Builder for the current demo. The original experimental implementation is
archived under `docs/archived-experiments/empty-event-form/` so it can be
reintroduced selectively if the experiment resumes.

## Purpose

The Super Admin Event Form Configuration Builder previously had an
experimental `Empty Form` action on the Event creation screen. It started a
blank Event configuration with one enabled `Untitled Section` and no core
fields. The active builder now uses the normal Builder and Preview flow.

## Archived scope and behavior

- The action is available only while creating an Event. Existing edit, view,
  Training, and other configuration flows keep the normal Builder behavior.
- Selecting it replaces the current local builder state. If local changes are
  present, the builder asks for confirmation first.
- The field picker is ordered `Custom` then `Core` while Empty Form mode is
  active, and it opens on `Custom`. Both tabs remain fully functional.
- Empty Form does not insert, require, or hide core fields. Users can compose
  custom-only, core-only, or mixed configurations; the existing validation and
  backend restrictions still apply when saving or publishing.
- Section creation, editing, duplication, deletion, preview, and the existing
  save/publish controls remain the same.
- The initial section keeps the existing stable key `section_untitled`. That
  persisted section identity lets the builder recognize the experimental mode
  after create, reopen, draft edits, publish, activation, and version reloads.
- A small in-builder notice explains that this is experimental and that the
  backend remains authoritative for accepted fields.

## Archived lifecycle and version behavior

Empty Form uses the existing Event configuration lifecycle without new APIs:

1. Create uses the existing draft create request.
2. Reopening the returned configuration maps the server sections and fields
   directly; it does not seed default sections or mandatory core fields.
3. Editing uses the existing update request, including tenant assignment
   persistence.
4. Publishing and activation use the existing publish and activate requests.
5. Existing immutable versions and the version history panel remain managed by
   the existing version endpoints. Editing a published configuration continues
   to create a new draft according to the backend contract.

The frontend does not simulate successful publication or activation. If the
backend rejects an Empty Form because its domain rules require core fields, the
existing API error is shown and the configuration remains subject to the same
publishing restrictions as any other Event form.

The current API response has no dedicated `empty_form` flag. Recognition uses
the existing persisted `section_untitled` stable key created by this
experiment. Renaming that section does not affect recognition, because its
stable key is unchanged. If an administrator deletes that marker section, or a
backend normalizes/removes the stable key, the frontend cannot reliably
distinguish the configuration from an ordinary Event configuration without a
backend-supported marker; it will then fall back to normal Builder behavior.

## Archived files

- `docs/archived-experiments/empty-event-form/` contains the original helper,
  focused test summary, builder/editor snippets, original requirements, and
  selective restoration notes.
- `docs/experimental-empty-event-form.md` documents the mode and its limits.

## Former active integration points

- `packages/features/platform-form-configurations/src/components/ConfigurationBuilder.tsx`
  previously owned the mode action, confirmation, custom-first picker ordering,
  default tab selection, status notice, and local dirty-state tracking. The
  normal Core-first picker remains active, including its existing default
  selection and initialization.
- `packages/features/platform-form-configurations/src/screens/FormConfigurationEditorScreen.tsx`
  previously enabled the entry action for Event creation. The active screen
  no longer passes the experimental prop.

## Backend dependency

No backend implementation or custom-only configuration contract exists in this
repository. The existing create/update/publish APIs and client validation rules
are reused without changing their endpoint, payload, or publishing restrictions.
Empty Form mode therefore does not pretend that a custom-only configuration is
accepted: the existing validation or server response remains authoritative. If
the deployed backend requires domain core fields, its existing validation
response will be shown by the builder.

## Removal record and reintroduction

Removed from active code:

- `allowEmptyEventForm` and all Empty Form mode state, actions, modal, notice,
  and picker-order changes from `ConfigurationBuilder.tsx`.
- `allowEmptyEventForm={isCreate}` from `FormConfigurationEditorScreen.tsx`.
- The experimental helper and test files under the platform configuration
  model directory.

The normal Builder/Preview tabs, Core-first field picker, default Event
initialization, lifecycle APIs, validation, preview, assignments, and version
management remain unchanged. The unrelated validation-key correction in
`ConfigurationBuilder.tsx` is preserved. To reintroduce the experiment, use
the archived snippets and restore only the documented Empty Form hunks; do not
restore whole files because they may contain unrelated changes.
