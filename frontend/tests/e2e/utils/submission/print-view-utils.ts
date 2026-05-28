import path from "path";

import type { Page } from "@playwright/test";

/**
 * Converts a workspace application form URL to its corresponding print view URL.
 *
 * Workspace URL format:  /workspace/applications/{applicationId}/form/{appFormId}
 * Print URL format:      /print/application/{applicationId}/form/{appFormId}
 */
export function buildPrintUrl(formUrl: string): string {
  return formUrl.replace(/\/workspace\/applications\//, "/print/application/");
}

/**
 * Navigates to a pre-built print view URL and waits for the page to settle.
 *
 * Call `buildPrintUrl(formUrl)` first to derive the print URL from a workspace
 * form URL captured before submission.
 *
 * @param page     - The Playwright page object.
 * @param printUrl - The print view URL (already transformed via buildPrintUrl).
 * @param waitMs   - Extra ms to wait after load for client-side rendering. Defaults to 3000.
 */
export async function navigateToPrintView(
  page: Page,
  printUrl: string,
  waitMs = 3000,
): Promise<void> {
  await page.goto(printUrl);
  await page.waitForLoadState("domcontentloaded");
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}

/**
 * Per-form test data builders, keyed by formKey (matches print-view-opportunities.json).
 *
 * Each builder returns a Record whose keys match the `userEnteredFields` keys in the JSON,
 * so the spec can look up both the filled value and the print view testId generically.
 *
 * Add a new entry here when a new form is introduced in print-view-opportunities.json.
 */

// Shared upload file used for all SF-424 attachment fields.
const SF424_TEST_UPLOAD_FILE = path.resolve(
  __dirname,
  "../../test-upload-files/sample-upload-kb.pdf",
);
const PRINT_VIEW_TEST_DATA_BUILDERS: Record<
  string,
  (suffix: number) => Record<string, string>
> = {
  projectAbstractSummary: (suffix) => ({
    applicantName: `TESTER BR ${suffix}`,
    projectTitle: `TESTING ${suffix}`,
    abstract: `This is a print view automation test ${suffix}`,
  }),
  sf424: (suffix) => {
    // Keep dynamic data within field max lengths to avoid server-side truncation.
    const shortSuffix = String(suffix).slice(-6);

    return ({
    // Section 1 – Submission Type (printTestId: "submission_type")
    submission_type: "Application",
    // Section 2 – Application Type (revision_type/revision_other_specify omitted: N/A for "New")
    application_type: "New",
    // Section 4–5 – Identifiers
    applicant_id: `APPID${shortSuffix}`,
    federal_entity_identifier: `FEI${shortSuffix}`,
    federal_award_identifier: `FAI${shortSuffix}`,
    // Section 6–7 – Org / EIN
    organization_name: `Org ${shortSuffix}`,
    employer_taxpayer_identification_number: "44-4444444",
    // Section 8 – Address
    applicant_street1: `${shortSuffix} Main St`,
    applicant_street2: `Suite ${shortSuffix}`,
    applicant_city: `City ${shortSuffix}`,
    applicant_state: "AL: Alabama",
    applicant_country: "USA: UNITED STATES",
    applicant_zip_code: "12345",
    // Section 8e – Dept / Division
    department_name: `Dept ${shortSuffix}`,
    division_name: `Div ${shortSuffix}`,
    // Section 8f – Contact Person
    contact_person_prefix: `CP${shortSuffix}`,
    contact_person_first_name: `CPFirst${shortSuffix}`,
    contact_person_middle_name: `CPMid${shortSuffix}`,
    contact_person_last_name: `CPLast${shortSuffix}`,
    contact_person_suffix: `CPS${shortSuffix}`,
    contact_person_title: `CPTitle${shortSuffix}`,
    organization_affiliation: `OrgAff${shortSuffix}`,
    phone_number: "8888888888",
    fax: "8888888888",
    email: `test${shortSuffix}@example.com`,
    // Section 9 – Applicant Type (printTestId: "applicant_type_code")
    applicant_type_code__combobox: "C: City or Township Government",
    applicant_type_other_specify: `ApplicantOther${shortSuffix}`,
    // Section 11–12 – Agency / Assistance Listing
    agency_name: `Agency ${shortSuffix}`,
    assistance_listing_program_title: `Program Title ${shortSuffix}`,
    // Section 15 – Project Title
    project_title: `Project ${shortSuffix}`,
    // Section 16 – Congressional Districts
    congressional_district_applicant: "00-000",
    congressional_district_program_project: "MD-000",
    // Section 17 – Project Dates
    project_start_date: "2030-10-01",
    project_end_date: "2036-10-31",
    // Section 18 – Estimated Funding
    federal_estimated_funding: "1000000",
    applicant_estimated_funding: "500000",
    state_estimated_funding: "250000",
    local_estimated_funding: "150000",
    other_estimated_funding: "50000",
    program_income_estimated_funding: "25000",
    // Section 19 – State Review (printTestId: "state_review")
    application_subject_to: "c. Program is not covered by E.O. 12372.",
    state_review_available_date: "2026-12-01",
    // Section 20 – Delinquent Federal Debt (printTestId: "delinquent_federal_debt")
    delinquent_federal_debt: "No",
    // Section 21 – Certification (no printTestId; validated via expectedPrepopulatedFields)
    certification_agree: "true",
    // Section 21 – Authorized Representative
    authorized_representative_prefix: `AR${shortSuffix}`,
    authorized_representative_first_name: `ARFirst${shortSuffix}`,
    authorized_representative_middle_name: `ARMid${shortSuffix}`,
    authorized_representative_last_name: `ARLast${shortSuffix}`,
    authorized_representative_suffix: `ARS${shortSuffix}`,
    authorized_representative_title: `ARTitle${shortSuffix}`,
    authorized_representative_phone_number: "2222222222",
    authorized_representative_fax: "3333333333",
    authorized_representative_email: `aor${shortSuffix}@test.com`,
    // Attachment fields — uploaded files validated by section locator in print view
    areas_affected_attachment: SF424_TEST_UPLOAD_FILE,
    additional_project_title_attachment: SF424_TEST_UPLOAD_FILE,
    additional_congressional_attachment: SF424_TEST_UPLOAD_FILE,
  });
  },
};

/**
 * Builds unique test data for the given form's user-entered fields.
 * The timestamp suffix prevents collisions across concurrent test runs.
 *
 * Keys in the returned Record match the `userEnteredFields` keys in
 * print-view-opportunities.json so the spec can resolve print testIds generically.
 *
 * @param formKey - The form key (e.g. "projectAbstractSummary").
 * @param suffix  - A numeric suffix appended to each value (e.g. Date.now()).
 * @throws if no builder is registered for the given formKey.
 */
export function buildPrintViewTestData(
  formKey: string,
  suffix: number,
): Record<string, string> {
  const builder = PRINT_VIEW_TEST_DATA_BUILDERS[formKey];
  if (!builder) {
    throw new Error(
      `No test data builder registered for formKey: "${formKey}". ` +
        `Add it to PRINT_VIEW_TEST_DATA_BUILDERS in print-view-utils.ts.`,
    );
  }
  return builder(suffix);
}
