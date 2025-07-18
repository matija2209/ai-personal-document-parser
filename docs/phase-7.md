Of course. Let's break down Phase 7, "Results Display & Management," into a detailed, actionable plan. The goal is to create a clear to-do list that a junior developer can follow, leveraging our tech stack of Next.js 15, shadcn/ui, and Tailwind CSS.

Before we begin, let's clarify a few assumptions to ensure we're aligned:

*   **Data Availability:** I am assuming that by this phase, the AI processing is complete. For any given document, we have access to the original image(s) stored in Cloudflare R2 and a structured JSON object of the extracted data (e.g., `{"firstName": "Jane", "lastName": "Doe", "dateOfBirth": "1995-08-22"}`) stored in our Neon database.
*   **Component Library:** All UI components mentioned should be sourced from the **shadcn/ui** library unless stated otherwise, to maintain consistency.
*   **API Endpoints:** This plan outlines the frontend tasks and the API endpoints they will need to communicate with. We are defining the *contract* for the API that the frontend will expect.

Here is the detailed plan for Phase 7.

***

## Phase 7: Results Display & Management - Detailed Plan

**GOAL:** Create intuitive interfaces for users to review, edit, and manage extracted document data. This phase focuses on making the data useful and accessible to the user after the AI has done its work.

### **Part 1: Document Results Page (View & Edit)**

This is the core of the phase, where users interact with the data extracted from a single document.

**User Story:** As a user, I want to see the information extracted from my document so I can verify its accuracy. If I find an error, I want to be able to easily correct it and save my changes.

#### **1.1. Create the Dynamic Page for a Single Document**

*   [ ] **File Structure:** In the `app/` directory, create a new dynamic route for displaying a single document. The structure should be `app/dashboard/document/[id]/page.tsx`.
*   [ ] **Data Fetching:** This page should be a Server Component. It will receive the `id` from the URL parameters. Use this `id` to fetch the specific document's metadata and its associated extraction results from the database using Prisma.
*   [ ] **Authentication Check:** Ensure that the fetched document belongs to the currently authenticated user. If not, or if the document doesn't exist, display a "Not Found" page. You can use Next.js's `notFound()` function for this.

#### **1.2. Build the Results Display UI**

*   [ ] **Component:** Create a new client component, `DocumentResults.tsx`, that will receive the fetched document and extraction data as props.
*   [ ] **Layout:** Use the `Card` component from shadcn/ui as the main container.
    *   Use `CardHeader`, `CardTitle`, and `CardDescription` to show the document type (e.g., "Driving License") and the date it was processed.
*   [ ] **Display Extracted Data:** Inside `CardContent`, render the extracted key-value pairs.
    *   Iterate through the JSON data and display each field label (e.g., "First Name") and its corresponding value (e.g., "Jane").
    *   Use a clean, two-column layout (e.g., using CSS Grid or Flexbox with Tailwind CSS) for readability.

#### **1.3. Implement Editable Form Fields**

This is the most interactive part. The user should be able to switch from viewing data to editing it.

*   [ ] **State Management:** In your `DocumentResults.tsx` client component, introduce two state variables using the `useState` hook:
    *   `isEditing` (boolean): To toggle between view mode and edit mode. Default to `false`.
    *   `formData` (object): To hold the values of the fields while editing. Initialize it with the extraction data passed in as props.
*   [ ] **Toggle Edit Mode:**
    *   Add an "Edit" `Button` to the UI. When clicked, it should set `isEditing` to `true`.
    *   When `isEditing` is `true`, render "Save" and "Cancel" buttons instead of the "Edit" button.
*   [ ] **Conditional Rendering:**
    *   When `isEditing` is `false`, display the data as plain text.
    *   When `isEditing` is `true`, render shadcn/ui `Input` components for each field, with their `value` bound to the `formData` state. The `onChange` handler for each input should update the corresponding key in the `formData` object.
*   [ ] **Saving and Canceling:**
    *   **Cancel Button:** On click, this button should set `isEditing` back to `false` and reset `formData` to the original, unmodified data.
    *   **Save Button:** On click, this button should trigger a call to the API to persist the changes.

#### **1.4. Create API Endpoint for Updates**

*   [ ] **API Route:** Create a new API route at `app/api/documents/[id]/route.ts`.
*   [ ] **Implement `PATCH` Handler:** This route should handle `PATCH` requests. It will:
    1.  Read the document `id` from the URL.
    2.  Read the updated `formData` from the request body.
    3.  Verify that the user making the request (via Clerk) is the owner of the document.
    4.  Update the `Extractions` table in the database with the new data.
    5.  **Data Correction Tracking:** Add a boolean field, `isManuallyCorrected`, to your `Extractions` table schema. When an update is saved via this endpoint, set this flag to `true`. This helps us track the accuracy of the AI models.
    6.  Return a success message or the updated document data.
*   [ ] **Frontend Integration:** In `DocumentResults.tsx`, when the "Save" button is clicked, make a `fetch` call to this `PATCH` endpoint. After a successful response, set `isEditing` back to `false` and update the local state to show the newly saved data.

***

### **Part 2: Document History and Dashboard**

This is the main view where users see a list of all their processed documents.

**User Story:** As a user, I want a dashboard where I can see all the documents I've scanned, quickly search through them, and take actions like viewing or deleting them.

#### **2.1. Build the Document History Table**

*   [ ] **Target Page:** This will be implemented on the main dashboard page, likely `app/dashboard/page.tsx`.
*   [ ] **Data Fetching:** The dashboard page should be a Server Component that fetches all documents belonging to the current user from the database.
*   [ ] **Component:** Use the `Table` components from shadcn/ui (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`) to display the list of documents.
*   [ ] **Table Columns:** The table should include the following columns:
    *   Document Type (e.g., "Passport")
    *   Date Processed
    *   Status (e.g., "Completed", "Failed")
    *   Actions (This column will contain buttons)
*   [ ] **Action Buttons:** In the "Actions" column for each row, add:
    *   A "View" button. This should be a Next.js `<Link>` that navigates the user to the corresponding `/dashboard/document/[id]` page.
    *   A "Delete" button. This will trigger the deletion workflow.

#### **2.2. Implement Search and Filter Functionality**

*   [ ] **Research Best Practices:** Use web research to find the best way to implement search with Next.js App Router and server components. The recommended approach is using URL query parameters (`searchParams`).
    *   [ ] **Search Input:**
    *   Add an `Input` component (from shadcn/ui) above the table for text search.
    *   This input should be a Client Component.
    *   When the user types, it should update a query parameter in the URL (e.g., `?search=jane`). Use the `useRouter` and `useSearchParams` hooks from `next/navigation` to achieve this without a full page reload.
    *   To prevent making an API call on every keystroke, implement a debounce mechanism on the input.
*   [ ] **Filter Dropdown:**
    *   Add a `Select` component (from shadcn/ui) to filter by "Document Type".
    *   When a user selects a type, update another query parameter (e.g., `?type=passport`).
*   [ ] **Server-Side Filtering Logic:**
    *   The `app/dashboard/page.tsx` server component automatically receives `searchParams` as a prop.
    *   Read the `search` and `type` values from the `searchParams` object.
    *   Modify your Prisma query to use these values in a `where` clause to filter the results before sending them to the `Table` component. This ensures the filtering is done efficiently in the database.

***

### **Part 3: Document Deletion and Export**

These are critical management workflows for a single document.

**User Story:** As a user, I need to be able to permanently delete a document I no longer need. I also want to export the extracted data for my own records.

#### **3.1. Build the Document Deletion Workflow**

*   [ ] **Confirmation Dialog:** To prevent accidental deletion, use the `AlertDialog` component from shadcn/ui. The "Delete" button in the history table and on the results page should trigger this dialog.
*   [ ] **API Route for Deletion:**
    *   Create a `DELETE` handler in the `app/api/documents/[id]/route.ts` file.
    *   This handler should first verify the user owns the document.
    *   It should then delete the document record and its associated extraction results from the database.
    *   **Crucially**, it must also trigger the deletion of the corresponding image file(s) from the Cloudflare R2 bucket.
*   [ ] **Frontend Integration:**
    *   When the user confirms in the `AlertDialog`, make a `fetch` call to the `DELETE` endpoint.
    *   Upon success, if the user is on the dashboard, refresh the table to remove the deleted item. The `router.refresh()` method from `next/navigation` is perfect for this.
    *   If the user is on the results page, redirect them back to the dashboard.

#### **3.2. Implement Export Functionality**

*   [ ] **Export Button:** On the document results page (`DocumentResults.tsx`), add an "Export as JSON" `Button`.
*   [ ] **Client-Side Logic:** This can be a purely client-side function.
    *   On click, take the `formData` JSON object.
    *   Use `JSON.stringify` to convert it to a string.
    *   Create a `Blob` with the type `application/json`.
    *   Use `URL.createObjectURL` to create a temporary URL for the Blob.
    *   Create a temporary `<a>` element, set its `href` to the object URL and its `download` attribute to something like `document-data.json`, and programmatically click it to trigger the browser's download prompt.

By completing these steps, you will have a fully functional and user-friendly interface for managing document results, fulfilling all the requirements of Phase 7.