# Event media link-or-upload contract

This contract applies only to the Event media fields `primary_image`, `gallery_images`, `videos`, and `documents`.

## Field values

Each media item is either a pasted HTTP(S) link or an uploaded file. Gallery Images, Videos, and Documents may mix links and uploads in one ordered list. Link and upload entries count together toward the field count limit.

## Media policy

The client fetches live policy data from:

```text
GET /api/v1/events/media/policy
```

The policy provides allowed types, maximum file size, and maximum item count per field. The documented limits are:

| Field | Allowed types | Maximum size | Maximum count |
| --- | --- | ---: | ---: |
| `primary_image` | `jpg`, `png`, `webp` | 5 MB | 1 |
| `gallery_images` | `jpg`, `png`, `webp`, `gif` | 5 MB each | 10 |
| `videos` | `mp4`, `webm`, `mov` | 100 MB each | 3 |
| `documents` | `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx` | 10 MB each | 10 |

## Immediate upload

Files upload immediately after selection through the authenticated application request path:

```text
POST /api/v1/events/media/
Content-Type: multipart/form-data
```

The multipart form contains:

- `file`
- `field`
- a unique `client_ref` for the upload attempt; retries reuse that same reference
- `enterprise_id` only for Super Admin requests

The UI shows progress for each file and supports retry/error states. It handles HTTP `401`, `403`, `413`, `415`, and `422` responses.

The upload response asset contains:

```text
id, field, url, name, size, type, attached, expires_at
```

Uploaded asset URLs are stored in Event form state. Uploaded document entries retain the asset metadata needed by the Event representation.

## Link validation

Links must use `http` or `https` and are normalized/stored as `https`. They may be at most 2048 characters, contain no spaces or credentials, and must use a public hostname. Bare IP addresses, `localhost`, single-word hosts, `javascript:`, `data:`, `ftp:`, and relative URLs are rejected. Query strings remain unchanged. The server does not fetch links. A `422` response may contain multiple field errors.

The server remains authoritative for link validation; client validation is user feedback only.

## Event create and update representation

Create and update values use:

- `primary_image`: a plain URL string
- `gallery_images`: an ordered array of plain URL strings
- `videos`: an ordered array of plain URL strings
- `documents`: an ordered array of uploaded asset objects or URL/name objects

No upload marker is sent. Item order is preserved.

For updates, only fields included in the request change. Omitted fields are preserved. Sending the complete list replaces a list; sending `null` for `primary_image` or `[]` for a list clears it.

## Removing uploaded assets

An uploaded asset that is removed before Event save is deleted with:

```text
DELETE /api/v1/events/media/{id}
```

The client handles `409` when an asset is already used by an Event. Existing saved assets are not deleted merely because an edit form was opened. Saved removed files and unattached uploads are cleaned up after 24 hours.

## Rendering and access

Detail, list, and approval responses follow the create representation. Documents may be objects with at least `url` and/or `name`, or legacy bare strings. Images render with `<img>` and videos with `<video>`. Published images load without login; published videos and documents require login. Draft and pending Events are staff/Super Admin only. Downloads preserve the original document filename.
