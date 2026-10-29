# Archived experiment: Empty Event Form

Status: temporarily removed from the active Event Form Configuration Builder.

## Purpose

The experiment added an Empty Form action to Event configuration creation. It
created a blank Event configuration with one enabled `Untitled Section` and no
Core fields, then allowed Custom fields to be added before Core fields.

## Original requirements

- Add an `Empty Form` mode beside Builder and Preview during Event creation.
- Start with one enabled Untitled Section and zero fields.
- Open the Add Field picker with Custom first and selected by default.
- Keep Core fields available and functional.
- Recognize the mode after persisted configuration reloads using the
  `section_untitled` stable key.
- Preserve the existing save, publish, activate, assignment, and version APIs.
- Keep Normal Builder behavior unchanged.

## Active files and functions

- `packages/features/platform-form-configurations/src/components/ConfigurationBuilder.tsx`
  - `ConfigurationBuilder`: Empty Form prop, mode state, local-change
    confirmation, mode reset, Empty Form button, status notice, and picker
    source selection.
  - `FieldPicker`: `customFirst` prop and conditional Custom/Core tab order.
- `packages/features/platform-form-configurations/src/screens/FormConfigurationEditorScreen.tsx`
  - Passes `allowEmptyEventForm={isCreate}` to the builder.
- `packages/features/platform-form-configurations/src/model/empty-event-form.ts`
  - `createEmptyEventFormConfiguration`.
  - `isEmptyEventFormConfiguration`.
- `packages/features/platform-form-configurations/src/model/empty-event-form.test.ts`
  - Initial shape, identity, persisted recognition, and ordinary-form tests.
- `docs/experimental-empty-event-form.md`
  - Experiment requirements and removal notes.

## Restore instructions

1. Reintroduce the archived `empty-event-form.ts` helper and its focused test.
2. Re-add the builder import, `allowEmptyEventForm` prop, mode state, reset and
   confirmation handlers, Empty Form tab, status notice, and modal.
3. Re-add the `customFirst` picker prop and conditional tab rendering.
4. Pass `allowEmptyEventForm={isCreate}` from the Event editor screen.
5. Restore the documentation and run the Platform Admin type, lint, and
   focused tests.

Apply these changes selectively. Do not restore whole files because the builder
and editor may contain unrelated changes made after this experiment.
