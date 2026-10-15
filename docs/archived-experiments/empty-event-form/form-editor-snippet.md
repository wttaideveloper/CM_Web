# FormConfigurationEditorScreen experiment snippet

The Event editor enabled the experiment only for create mode by passing:

```tsx
<ConfigurationBuilder
  ...
  allowEmptyEventForm={isCreate}
  ...
/>
```

The existing create configuration initialization and all lifecycle mutations
were intentionally not part of the experiment.
