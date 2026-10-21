# ConfigurationBuilder experiment snippets

The following focused snippets are sufficient to reintroduce the experiment.

```tsx
import { createEmptyEventFormConfiguration, isEmptyEventFormConfiguration } from "../model/empty-event-form";

allowEmptyEventForm?: boolean;
const emptyFormAvailable = allowEmptyEventForm || isEmptyEventFormConfiguration(initialConfiguration);
const [emptyFormMode, setEmptyFormMode] = useState(() => emptyFormAvailable && isEmptyEventFormConfiguration(initialConfiguration));
const [emptyFormConfirmationOpen, setEmptyFormConfirmationOpen] = useState(false);
const [hasLocalChanges, setHasLocalChanges] = useState(false);
```

The experiment reset builder state when the configuration changed, tracked local
changes, created an Empty Form with `createEmptyEventFormConfiguration()`, and
asked for confirmation before replacing local changes.

The FieldPicker integration passed `customFirst={emptyFormMode}`. Its tabs were:

```tsx
{customFirst ? <CustomTab /> : null}
<CoreTab />
{!customFirst ? <CustomTab /> : null}
```

The Event builder rendered an Empty Form tab, an experimental status notice, and
a confirmation dialog. New sections opened the picker with:

```tsx
setFieldSource(emptyFormMode ? "custom" : "core");
```
