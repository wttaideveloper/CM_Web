const enterpriseTrainingsEnglish = {
  taxonomy: {
    chooseCategory: "Choose a category",
    chooseCategoryFirst: "Choose a category first",
    chooseSubcategory: "Choose a subcategory",
  },
  referenceOptions: {
    selectTimeZone: "Select a time zone",
    selectCurrency: "Select a currency",
  },
  numberRange: {
    adjustedToMinimum: "Adjusted to the minimum allowed value ({{value}}).",
    adjustedToMaximum: "Adjusted to the maximum allowed value ({{value}}).",
  },
  media: {
    addImage: "Add image",
    addVideo: "Add video",
    addDocument: "Add document",
    addNoteHandout: "Add note / handout",
    addNotesPdf: "Add notes PDF",
    video: "Video",
    notesPdf: "Notes PDF",
    addItem: "Add {{item}}",
    item: "item",
    image: "image",
    noteHandout: "note / handout",
    cancel: "Cancel",
    uploadComplete: "Upload complete. Save your changes to apply this file.",
    noAllowedFormats: "No file formats are enabled for this field.",
    allowedFormatError: "Choose a file in an allowed format: {{formats}}.",
    maxFileSizeError: "Choose a file no larger than {{maxFileSizeMb}} MB.",
    uploadFailed: "Unable to upload this file. Please try again.",
    dimensionsUnavailable: "Image dimensions could not be checked. Review the preview before saving.",
    minimumImageWidth: "at least 1280 px wide",
    imageAspectRatio: "a 16:9 aspect ratio",
    imageQualityWarning: "Recommended cover images are {{recommendations}}. This image is {{width}} × {{height}} px and can still be uploaded.",
  },
} as const;

export default enterpriseTrainingsEnglish;
