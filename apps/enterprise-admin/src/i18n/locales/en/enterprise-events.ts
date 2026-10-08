const enterpriseEventsEnglish = {
  taxonomy: {
    chooseCategory: "Choose a category",
    chooseCategoryFirst: "Choose a category first",
    chooseSubcategory: "Choose a subcategory",
  },
  numberRange: {
    adjustedToMinimum: "Adjusted to the minimum allowed value ({{value}}).",
    adjustedToMaximum: "Adjusted to the maximum allowed value ({{value}}).",
  },
  numberInput: {
    hint: "Enter a whole number or decimal, such as 12 or 12.5.",
    hintWithRange: "Enter a whole number or decimal from {{min}} to {{max}}.",
    hintWithMinimum: "Enter a whole number or decimal of at least {{min}}.",
    hintWithMaximum: "Enter a whole number or decimal of at most {{max}}.",
    invalid: "{{label}} must be a number, such as 12 or 12.5.",
  },
  formatValidation: {
    digitsOnly: "{{label}} must contain digits only (0–9).",
    exactDigits: "{{label}} must contain exactly {{count}} digits.",
    digitRange: "{{label}} must contain between {{min}} and {{max}} digits.",
    minimumDigits: "{{label}} must contain at least {{min}} digits.",
    lettersAndSpaces: "{{label}} can contain letters and spaces only.",
    lettersNumbersAndSpaces: "{{label}} can contain letters, numbers, and spaces only.",
    email: "Enter an email address in the format name@example.com.",
    phone: "Enter a phone number using 7–20 digits, spaces, parentheses, +, or hyphens.",
    custom: "{{label}} must match this configured format: {{pattern}}",
  },
} as const;

export default enterpriseEventsEnglish;
