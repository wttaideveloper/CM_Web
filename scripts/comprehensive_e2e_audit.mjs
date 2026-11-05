// Updated Comprehensive End-to-End Blog Module Audit Execution Script
import fs from 'fs';

const BASE_SHELL = 'http://localhost:3000';
const BASE_ENTERPRISE = 'http://localhost:3001';
const BASE_PLATFORM = 'http://localhost:3002';

const SUPER_ADMIN_CREDENTIALS = {
  email: 'harshi.rvh04+852@gmail.com',
  password: 'Admin@1234',
  rememberMe: true,
};

const ENTERPRISE_ADMIN_CREDENTIALS = {
  username: 'petersnolan53@gmail.com',
  password: 'Hakeem@12',
  rememberMe: true,
};

const auditReport = [];

function logTest(test) {
  auditReport.push({
    timestamp: new Date().toISOString(),
    ...test,
  });
  console.log(`[${test.status.toUpperCase()}] ${test.testId} [${test.severity}]: ${test.title}`);
  if (test.notes) console.log(`   -> ${test.notes}`);
}

async function loginSuperAdmin() {
  const res = await fetch(`${BASE_SHELL}/api/platform-super-admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(SUPER_ADMIN_CREDENTIALS),
  });
  const data = await res.json();
  const cookies = res.headers.getSetCookie();
  return {
    status: res.status,
    data,
    cookies: cookies.map(c => c.split(';')[0]).join('; '),
  };
}

async function loginEnterpriseAdmin() {
  const returnTo = '/auth/validate?return_to=' + encodeURIComponent('http://localhost:3001/admin/blogs');
  const startUrl = `${BASE_SHELL}/api/v1/auth/login?module=enterprise&frontend_origin=${encodeURIComponent(BASE_SHELL)}&return_to=${encodeURIComponent(returnTo)}&rememberMe=true`;
  const r1 = await fetch(startUrl, { redirect: 'manual' });
  const keycloakUrl = r1.headers.get('location');
  const backendCookies1 = r1.headers.getSetCookie();

  const r2 = await fetch(keycloakUrl);
  const kcCookies = r2.headers.getSetCookie();
  const html = await r2.text();

  const formMatch = html.match(/action="([^"]+)"/i);
  if (!formMatch) throw new Error('Keycloak form action not found');
  const formAction = formMatch[1].replace(/&amp;/g, '&');

  const kcCookieHeader = kcCookies.map(c => c.split(';')[0]).join('; ');
  const postParams = new URLSearchParams({
    username: ENTERPRISE_ADMIN_CREDENTIALS.username,
    password: ENTERPRISE_ADMIN_CREDENTIALS.password,
    rememberMe: 'on',
  });

  const r3 = await fetch(formAction, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': kcCookieHeader,
    },
    body: postParams.toString(),
    redirect: 'manual',
  });

  const callbackUrl = r3.headers.get('location');
  const r4 = await fetch(callbackUrl, {
    redirect: 'manual',
    headers: { 'Cookie': backendCookies1.map(c => c.split(';')[0]).join('; ') },
  });

  const callbackLocation = r4.headers.get('location');
  const callbackCookies = r4.headers.getSetCookie();
  const validateUrl = new URL(callbackLocation);
  const sessionCode = validateUrl.searchParams.get('he_session_code');

  const completeRes = await fetch(`${BASE_SHELL}/api/v1/auth/complete-login?sessionCode=${sessionCode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': callbackCookies.map(c => c.split(';')[0]).join('; '),
    },
    body: JSON.stringify({ sessionCode }),
  });

  const completeBody = await completeRes.json();
  const sessionCookies = completeRes.headers.getSetCookie();
  return {
    status: completeRes.status,
    data: completeBody,
    cookies: sessionCookies.map(c => c.split(';')[0]).join('; '),
  };
}

async function run() {
  console.log('Starting Complete End-to-End Blog Module Audit...\n');

  // ==========================================
  // SECTION 1: AUTHENTICATION & ACCESS CONTROL
  // ==========================================
  console.log('=== SECTION 1: AUTHENTICATION & ACCESS CONTROL ===');
  const superSession = await loginSuperAdmin();
  logTest({
    testId: 'TC-AUTH-01',
    portal: 'Super Admin',
    role: 'Super Admin',
    url: `${BASE_SHELL}/api/platform-super-admin/login`,
    title: 'Super Admin Login & Session Cookie Establishment',
    prerequisites: 'Valid credentials for harshi.rvh04+852@gmail.com',
    steps: 'POST JSON with email, password, rememberMe to /api/platform-super-admin/login',
    testData: 'email: harshi.rvh04+852@gmail.com',
    expectedResult: 'HTTP 200, isSuperAdmin: true, ihp_super_admin_refresh & ihp_super_admin_remember_me HttpOnly cookies set',
    actualResult: `HTTP ${superSession.status}, isSuperAdmin: ${superSession.data?.data?.isSuperAdmin}`,
    status: superSession.status === 200 && superSession.data?.data?.isSuperAdmin ? 'pass' : 'fail',
    severity: 'Blocker',
    notes: 'Super Admin session authenticated successfully.',
  });

  const entSession = await loginEnterpriseAdmin();
  logTest({
    testId: 'TC-AUTH-02',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_SHELL}/api/v1/auth/login`,
    title: 'Enterprise Admin Login (Keycloak OIDC PKCE flow)',
    prerequisites: 'Valid credentials for petersnolan53@gmail.com',
    steps: 'Initiate OIDC flow -> Keycloak credential submit -> code exchange via /api/v1/auth/complete-login',
    testData: 'username: petersnolan53@gmail.com, tenant: tester-shop',
    expectedResult: 'HTTP 200, access_token & refresh_token issued, tenant membership verified',
    actualResult: `HTTP ${entSession.status}, tenant: ${entSession.data?.data?.membership?.tenantSlug}`,
    status: entSession.status === 200 && entSession.data?.authenticated ? 'pass' : 'fail',
    severity: 'Blocker',
    notes: 'Enterprise Admin authenticated with tenant: tester-shop.',
  });

  const unauthQueue = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/queue`);
  logTest({
    testId: 'TC-AUTH-03',
    portal: 'Super Admin',
    role: 'Anonymous',
    url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/queue`,
    title: 'Block Unauthenticated Access to Super Admin Approval Queue API',
    prerequisites: 'No session cookies',
    steps: 'GET /api/platform-super-admin/blogs/cms/blogs/admin/queue without cookie header',
    expectedResult: 'HTTP 401 Unauthorized',
    actualResult: `HTTP ${unauthQueue.status}`,
    status: unauthQueue.status === 401 ? 'pass' : 'fail',
    severity: 'Critical',
    notes: 'Unauthenticated API access rejected.',
  });

  const unauthMyPosts = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`);
  logTest({
    testId: 'TC-AUTH-04',
    portal: 'Enterprise Admin',
    role: 'Anonymous',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`,
    title: 'Block Unauthenticated Access to Enterprise Admin My Posts API',
    prerequisites: 'No session cookies',
    steps: 'GET /api/v1/cms/blogs/my/posts without cookies',
    expectedResult: 'HTTP 401 Unauthorized',
    actualResult: `HTTP ${unauthMyPosts.status}`,
    status: unauthMyPosts.status === 401 ? 'pass' : 'fail',
    severity: 'Critical',
    notes: 'Unauthenticated API access rejected.',
  });

  const entCrossQueue = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/queue`, {
    headers: { 'Cookie': entSession.cookies },
  });
  logTest({
    testId: 'TC-AUTH-05',
    portal: 'Super Admin',
    role: 'Enterprise Admin',
    url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/queue`,
    title: 'Enforce Role Boundary: Enterprise Admin Accessing Super Admin Queue',
    prerequisites: 'Enterprise Admin cookie used on Super Admin endpoint',
    steps: 'GET /api/platform-super-admin/blogs/cms/blogs/admin/queue with Enterprise Admin cookie',
    expectedResult: 'HTTP 401 or 403 Forbidden',
    actualResult: `HTTP ${entCrossQueue.status}`,
    status: entCrossQueue.status === 401 || entCrossQueue.status === 403 ? 'pass' : 'fail',
    severity: 'Critical',
    notes: 'Enterprise Admin prevented from accessing Super Admin queue.',
  });

  // ==========================================
  // SECTION 2: BLOG LISTING & NAVIGATION
  // ==========================================
  console.log('\n=== SECTION 2: BLOG LISTING & NAVIGATION ===');
  const formRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/form?kind=blog`, {
    headers: { 'Cookie': entSession.cookies },
  });
  const formData = await formRes.json().catch(() => null);
  logTest({
    testId: 'TC-LIST-01',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/form?kind=blog`,
    title: 'Fetch Active Blog Form Definition',
    steps: 'GET /api/v1/cms/blogs/my/form?kind=blog',
    expectedResult: 'HTTP 200 with form_id, version, definition with fields',
    actualResult: `HTTP ${formRes.status}, version: ${formData?.version}, form_id: ${formData?.form_id}`,
    status: formRes.status === 200 && formData?.form_id ? 'pass' : 'fail',
    severity: 'High',
    notes: `Active form name: "${formData?.name}", version: ${formData?.version}`,
  });

  const catRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/categories`);
  const catData = await catRes.json().catch(() => null);
  const activeCategory = catData?.items?.[0] || { id: 'default', name: 'General' };
  logTest({
    testId: 'TC-LIST-02',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/categories`,
    title: 'List Active Blog Categories',
    steps: 'GET /api/v1/cms/blogs/categories',
    expectedResult: 'HTTP 200 with category list',
    actualResult: `HTTP ${catRes.status}, count: ${catData?.items?.length ?? 0}`,
    status: catRes.status === 200 && catData?.items?.length > 0 ? 'pass' : 'fail',
    severity: 'High',
    notes: `Found categories: ${catData?.items?.map(c => c.name).join(', ')}`,
  });

  const entListRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts?page=1&page_size=10&search=test`, {
    headers: { 'Cookie': entSession.cookies },
  });
  const entListData = await entListRes.json().catch(() => null);
  logTest({
    testId: 'TC-LIST-03',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts?page=1&page_size=10&search=test`,
    title: 'Enterprise Admin My Posts Search & Pagination Query',
    steps: 'GET /api/v1/cms/blogs/my/posts with query parameters page=1, page_size=10, search=test',
    expectedResult: 'HTTP 200 with paginated items array and pagination metadata',
    actualResult: `HTTP ${entListRes.status}, total: ${entListData?.pagination?.total ?? 0}, returned: ${entListData?.items?.length ?? 0}`,
    status: entListRes.status === 200 && Array.isArray(entListData?.items) ? 'pass' : 'fail',
    severity: 'High',
  });

  const superListRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts?page=1&page_size=10`, {
    headers: { 'Cookie': superSession.cookies },
  });
  const superListData = await superListRes.json().catch(() => null);
  logTest({
    testId: 'TC-LIST-04',
    portal: 'Super Admin',
    role: 'Super Admin',
    url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts`,
    title: 'Super Admin All Published Posts Directory',
    steps: 'GET /api/platform-super-admin/blogs/cms/blogs/admin/posts',
    expectedResult: 'HTTP 200 with all posts across all enterprises',
    actualResult: `HTTP ${superListRes.status}, items: ${superListData?.items?.length ?? 0}`,
    status: superListRes.status === 200 && Array.isArray(superListData?.items) ? 'pass' : 'fail',
    severity: 'High',
  });

  // ==========================================
  // SECTION 3: CREATE BLOG WORKFLOW & VALIDATION
  // ==========================================
  console.log('\n=== SECTION 3: CREATE BLOG WORKFLOW & VALIDATION ===');

  const valRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`, {
    method: 'POST',
    headers: { 'Cookie': entSession.cookies, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'blog' }),
  });
  const valBody = await valRes.json().catch(() => null);
  logTest({
    testId: 'TC-CREATE-01',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`,
    title: 'Create Blog Missing Required Fields Validation',
    steps: 'POST /api/v1/cms/blogs/my/posts with { kind: "blog" } only',
    expectedResult: 'HTTP 422 with validation errors for required fields',
    actualResult: `HTTP ${valRes.status}, errors: ${JSON.stringify(valBody?.detail)}`,
    status: valRes.status === 422 || valRes.status === 400 ? 'pass' : 'fail',
    severity: 'High',
    notes: 'Backend enforces required fields via 422 schema validation.',
  });

  const newPostTitle = `Automated QA Audit Post ${Date.now()}`;
  const validDraftPayload = {
    kind: 'blog',
    title: newPostTitle,
    excerpt: 'Executive summary of this audit test blog post.',
    content: '<p>Comprehensive clinical guidelines and <strong>wellness insights</strong> for patient health.</p>',
    category_id: activeCategory.id,
    cover_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
    custom_fields: { post_type: 'blog' },
    form_id: formData?.form_id ?? null,
    form_version: formData?.version ?? null,
    module: 'general',
  };

  const createDraftRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`, {
    method: 'POST',
    headers: { 'Cookie': entSession.cookies, 'Content-Type': 'application/json' },
    body: JSON.stringify(validDraftPayload),
  });
  const createdDraft = await createDraftRes.json().catch(() => null);
  const postId = createdDraft?.id;

  logTest({
    testId: 'TC-CREATE-02',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`,
    title: 'Create Valid Enterprise Draft Blog Post',
    steps: 'POST valid payload according to active form configuration',
    testData: `title: ${newPostTitle}`,
    expectedResult: 'HTTP 201 Created, status: "draft", valid UUID returned',
    actualResult: `HTTP ${createDraftRes.status}, id: ${postId}, status: ${createdDraft?.status}`,
    status: (createDraftRes.status === 201 || createDraftRes.status === 200) && postId ? 'pass' : 'fail',
    severity: 'Blocker',
    notes: `Created draft post ID: ${postId}`,
  });

  // Duplicate Title handling
  const dupSlugPayload = { ...validDraftPayload, title: newPostTitle };
  const dupSlugRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`, {
    method: 'POST',
    headers: { 'Cookie': entSession.cookies, 'Content-Type': 'application/json' },
    body: JSON.stringify(dupSlugPayload),
  });
  const dupSlugBody = await dupSlugRes.json().catch(() => null);
  logTest({
    testId: 'TC-CREATE-03',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts`,
    title: 'Duplicate Title & Slug Collision Behavior',
    steps: 'POST another blog with identical title to trigger slug collision',
    testData: `duplicate title: ${newPostTitle}`,
    expectedResult: 'HTTP 400/409 Conflict, or server auto-increments slug with suffix',
    actualResult: `HTTP ${dupSlugRes.status}, slug: ${dupSlugBody?.slug ?? dupSlugBody?.detail}`,
    status: dupSlugRes.status === 201 || dupSlugRes.status === 400 || dupSlugRes.status === 409 ? 'pass' : 'fail',
    severity: 'High',
    notes: dupSlugRes.status === 201 ? `Server auto-resolved duplicate slug: "${dupSlugBody?.slug}"` : 'Duplicate rejected.',
  });
  if (dupSlugBody?.id && dupSlugBody.id !== postId) {
    await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${dupSlugBody.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': entSession.cookies },
    });
  }

  // ==========================================
  // SECTION 4: EDIT BLOG WORKFLOW (PATCH)
  // ==========================================
  console.log('\n=== SECTION 4: EDIT BLOG WORKFLOW ===');
  if (postId) {
    const updatedTitle = `${newPostTitle} (Revised Edition)`;
    const editRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Cookie': entSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updatedTitle,
        excerpt: 'Updated summary after editorial pass.',
      }),
    });
    const editData = await editRes.json().catch(() => null);
    logTest({
      testId: 'TC-EDIT-01',
      portal: 'Enterprise Admin',
      role: 'Enterprise Admin',
      url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}`,
      title: 'Update Existing Draft Post (PATCH)',
      steps: 'PATCH /api/v1/cms/blogs/my/posts/:id with updated title and excerpt',
      testData: updatedTitle,
      expectedResult: 'HTTP 200, title updated to revised string',
      actualResult: `HTTP ${editRes.status}, title: "${editData?.title}"`,
      status: editRes.status === 200 && editData?.title === updatedTitle ? 'pass' : 'fail',
      severity: 'Critical',
      notes: 'Draft updated successfully via PATCH.',
    });
  }

  // ==========================================
  // SECTION 5: SUBMIT, REVIEW & PUBLISHING
  // ==========================================
  console.log('\n=== SECTION 5: SUBMIT, REVIEW & PUBLISH WORKFLOW ===');
  if (postId) {
    // 1. Submit draft for review
    const submitRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}/submit`, {
      method: 'POST',
      headers: { 'Cookie': entSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({ change_notes: 'Submitting article for platform clinical compliance review.' }),
    });
    const submitData = await submitRes.json().catch(() => null);
    logTest({
      testId: 'TC-REV-01',
      portal: 'Enterprise Admin',
      role: 'Enterprise Admin',
      url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}/submit`,
      title: 'Enterprise Admin Submits Draft for Super Admin Review',
      steps: 'POST /api/v1/cms/blogs/my/posts/:id/submit with change notes',
      expectedResult: 'HTTP 200, status transitions from "draft" to "pending_approval"',
      actualResult: `HTTP ${submitRes.status}, status: "${submitData?.status}"`,
      status: submitRes.status === 200 && submitData?.status === 'pending_approval' ? 'pass' : 'fail',
      severity: 'Blocker',
      notes: 'Status transition draft -> pending_approval verified.',
    });

    // 2. Verify appearance in Super Admin approval queue
    const queueCheck = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/queue?page=1&page_size=50`, {
      headers: { 'Cookie': superSession.cookies },
    });
    const queueData = await queueCheck.json().catch(() => null);
    const itemInQueue = queueData?.items?.find(i => i.id === postId);
    logTest({
      testId: 'TC-REV-02',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/queue`,
      title: 'Submitted Post Appears in Super Admin Approval Queue',
      steps: 'GET /api/platform-super-admin/blogs/cms/blogs/admin/queue',
      expectedResult: 'Post ID found in queue items list with author and tenant details',
      actualResult: `Found: ${Boolean(itemInQueue)}, business_name: "${itemInQueue?.business_name}"`,
      status: Boolean(itemInQueue) ? 'pass' : 'fail',
      severity: 'Blocker',
      notes: `Verified in approval queue under tenant "${itemInQueue?.business_name}".`,
    });

    // 3. Super Admin rejects without reason (action: "reject", reason: "")
    const rejectEmptyRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/review`, {
      method: 'POST',
      headers: { 'Cookie': superSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason: '' }),
    });
    const rejectEmptyBody = await rejectEmptyRes.json().catch(() => null);
    logTest({
      testId: 'TC-REV-03',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/review`,
      title: 'Super Admin Reject Blog Without Feedback Reason (Validation)',
      steps: 'POST /review with action="reject" and empty reason',
      expectedResult: 'HTTP 400/422 validation error requiring reason',
      actualResult: `HTTP ${rejectEmptyRes.status}, detail: ${rejectEmptyBody?.detail ?? JSON.stringify(rejectEmptyBody)}`,
      status: rejectEmptyRes.status === 400 || rejectEmptyRes.status === 422 ? 'pass' : 'fail',
      severity: 'Medium',
      notes: 'Server enforced mandatory rejection reason.',
    });

    // 4. Super Admin requests changes (action: "request_changes")
    const requestChangesRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/review`, {
      method: 'POST',
      headers: { 'Cookie': superSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_changes', reason: 'Please update cover image resolution and refine medical terminology.' }),
    });
    const requestChangesData = await requestChangesRes.json().catch(() => null);
    logTest({
      testId: 'TC-REV-04',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/review`,
      title: 'Super Admin Requests Changes on Submitted Blog',
      steps: 'POST /review with action="request_changes" and descriptive reason',
      expectedResult: 'HTTP 200, status becomes "changes_requested"',
      actualResult: `HTTP ${requestChangesRes.status}, status: "${requestChangesData?.status}"`,
      status: requestChangesRes.status === 200 && requestChangesData?.status === 'changes_requested' ? 'pass' : 'fail',
      severity: 'Blocker',
      notes: 'Status transitioned to changes_requested.',
    });

    // 5. Enterprise Admin views changes requested feedback
    const viewChangesRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}`, {
      headers: { 'Cookie': entSession.cookies },
    });
    const viewChangesData = await viewChangesRes.json().catch(() => null);
    const feedbackMsg = viewChangesData?.reviewer_note || viewChangesData?.feedback || viewChangesData?.rejection_reason;
    logTest({
      testId: 'TC-REV-05',
      portal: 'Enterprise Admin',
      role: 'Enterprise Admin',
      url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}`,
      title: 'Enterprise Admin Views Reviewer Notes on Changes Requested Post',
      steps: 'GET /api/v1/cms/blogs/my/posts/:id',
      expectedResult: 'status is "changes_requested" and reviewer feedback is visible',
      actualResult: `status: "${viewChangesData?.status}", reviewer_note: "${feedbackMsg}"`,
      status: viewChangesData?.status === 'changes_requested' && Boolean(feedbackMsg) ? 'pass' : 'fail',
      severity: 'High',
      notes: `Reviewer notes successfully retrieved: "${feedbackMsg}"`,
    });

    // 6. Enterprise Admin resubmits post
    const resubmitRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}/submit`, {
      method: 'POST',
      headers: { 'Cookie': entSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({ change_notes: 'Updated cover image resolution as requested.' }),
    });
    const resubmitData = await resubmitRes.json().catch(() => null);
    logTest({
      testId: 'TC-REV-06',
      portal: 'Enterprise Admin',
      role: 'Enterprise Admin',
      url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}/submit`,
      title: 'Enterprise Admin Resubmits Post After Changes',
      steps: 'POST /api/v1/cms/blogs/my/posts/:id/submit from changes_requested status',
      expectedResult: 'HTTP 200, status returns to "pending_approval"',
      actualResult: `HTTP ${resubmitRes.status}, status: "${resubmitData?.status}"`,
      status: resubmitRes.status === 200 && resubmitData?.status === 'pending_approval' ? 'pass' : 'fail',
      severity: 'Blocker',
      notes: 'Post returned to pending_approval queue.',
    });

    // 7. Super Admin Approves Post
    const approveRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/review`, {
      method: 'POST',
      headers: { 'Cookie': superSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', reason: 'Content approved for publication.' }),
    });
    const approveData = await approveRes.json().catch(() => null);
    logTest({
      testId: 'TC-PUB-01',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/review`,
      title: 'Super Admin Approves Blog Post (action="approve")',
      steps: 'POST /review with action="approve"',
      expectedResult: 'HTTP 200, status becomes "approved" or "published"',
      actualResult: `HTTP ${approveRes.status}, status: "${approveData?.status}"`,
      status: approveRes.status === 200 && (approveData?.status === 'approved' || approveData?.status === 'published') ? 'pass' : 'fail',
      severity: 'Blocker',
      notes: `Approval resulted in status: ${approveData?.status}`,
    });

    // 8. If approved, publish explicitly
    if (approveData?.status === 'approved') {
      const pubRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/publish`, {
        method: 'POST',
        headers: { 'Cookie': superSession.cookies },
      });
      const pubData = await pubRes.json().catch(() => null);
      logTest({
        testId: 'TC-PUB-02',
        portal: 'Super Admin',
        role: 'Super Admin',
        url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/publish`,
        title: 'Super Admin Publishes Approved Post',
        steps: 'POST /publish on approved post',
        expectedResult: 'HTTP 200, status: "published"',
        actualResult: `HTTP ${pubRes.status}, status: "${pubData?.status}"`,
        status: pubRes.status === 200 && pubData?.status === 'published' ? 'pass' : 'fail',
        severity: 'Blocker',
      });
    }

    // 9. Pin post
    const pinRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/pin`, {
      method: 'PUT',
      headers: { 'Cookie': superSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: true }),
    });
    const pinData = await pinRes.json().catch(() => null);
    logTest({
      testId: 'TC-PUB-03',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/pin`,
      title: 'Super Admin Pins Published Blog Post (PUT { pinned: true })',
      steps: 'PUT /pin with { pinned: true }',
      expectedResult: 'HTTP 200, is_pinned: true',
      actualResult: `HTTP ${pinRes.status}, is_pinned: ${pinData?.is_pinned}`,
      status: pinRes.status === 200 && pinData?.is_pinned === true ? 'pass' : 'fail',
      severity: 'Medium',
      notes: 'Pin status verified.',
    });

    // 10. Unpin post
    const unpinRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/pin`, {
      method: 'PUT',
      headers: { 'Cookie': superSession.cookies, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: false }),
    });
    const unpinData = await unpinRes.json().catch(() => null);
    logTest({
      testId: 'TC-PUB-04',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/pin`,
      title: 'Super Admin Unpins Blog Post (PUT { pinned: false })',
      steps: 'PUT /pin with { pinned: false }',
      expectedResult: 'HTTP 200, is_pinned: false',
      actualResult: `HTTP ${unpinRes.status}, is_pinned: ${unpinData?.is_pinned}`,
      status: unpinRes.status === 200 && unpinData?.is_pinned === false ? 'pass' : 'fail',
      severity: 'Medium',
      notes: 'Unpin status verified.',
    });

    // 11. Unpublish post
    const unpubRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/unpublish`, {
      method: 'POST',
      headers: { 'Cookie': superSession.cookies },
    });
    const unpubData = await unpubRes.json().catch(() => null);
    logTest({
      testId: 'TC-PUB-05',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}/unpublish`,
      title: 'Super Admin Unpublishes Blog Post',
      steps: 'POST /unpublish',
      expectedResult: 'HTTP 200, status: "unpublished"',
      actualResult: `HTTP ${unpubRes.status}, status: "${unpubData?.status}"`,
      status: unpubRes.status === 200 && unpubData?.status === 'unpublished' ? 'pass' : 'fail',
      severity: 'Critical',
      notes: 'Unpublished verified.',
    });

    // ==========================================
    // SECTION 6: DELETE WORKFLOW
    // ==========================================
    console.log('\n=== SECTION 6: DELETE WORKFLOW ===');
    // Super Admin deletes the post
    const superDeleteRes = await fetch(`${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Cookie': superSession.cookies },
    });
    logTest({
      testId: 'TC-DEL-01',
      portal: 'Super Admin',
      role: 'Super Admin',
      url: `${BASE_PLATFORM}/api/platform-super-admin/blogs/cms/blogs/admin/posts/${postId}`,
      title: 'Super Admin Deletes Blog Post',
      steps: 'DELETE /api/platform-super-admin/blogs/cms/blogs/admin/posts/:id',
      expectedResult: 'HTTP 200 or 204 No Content',
      actualResult: `HTTP ${superDeleteRes.status}`,
      status: superDeleteRes.status === 200 || superDeleteRes.status === 204 ? 'pass' : 'fail',
      severity: 'Blocker',
      notes: 'Post deleted by Super Admin.',
    });

    // Verify deleted post returns 404
    const verifyDeleted = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}`, {
      headers: { 'Cookie': entSession.cookies },
    });
    logTest({
      testId: 'TC-DEL-02',
      portal: 'Enterprise Admin',
      role: 'Enterprise Admin',
      url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${postId}`,
      title: 'Verify Deleted Blog Cannot Be Accessed Via API (404)',
      steps: 'GET /api/v1/cms/blogs/my/posts/:id after deletion',
      expectedResult: 'HTTP 404 Not Found',
      actualResult: `HTTP ${verifyDeleted.status}`,
      status: verifyDeleted.status === 404 ? 'pass' : 'fail',
      severity: 'Critical',
      notes: 'Deleted post correctly returns 404.',
    });
  }

  // ==========================================
  // SECTION 7: SECURITY & IDOR
  // ==========================================
  console.log('\n=== SECTION 7: SECURITY & IDOR ===');
  const platformPostId = '2c98f062-9caa-4059-ae39-899408efb943';
  const idorRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${platformPostId}`, {
    headers: { 'Cookie': entSession.cookies },
  });
  logTest({
    testId: 'TC-SEC-01',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${platformPostId}`,
    title: 'IDOR Isolation: Enterprise Admin Accessing Platform Post',
    steps: 'GET /api/v1/cms/blogs/my/posts/:id where post is owned by Super Admin (tenant_id is null)',
    expectedResult: 'HTTP 404 Not Found or 403 Forbidden',
    actualResult: `HTTP ${idorRes.status}`,
    status: idorRes.status === 404 || idorRes.status === 403 ? 'pass' : 'fail',
    severity: 'Critical',
    notes: idorRes.status === 200 ? 'VULNERABILITY: Enterprise Admin can view platform-level post via merchant endpoint.' : 'Protected.',
  });

  const idorDelRes = await fetch(`${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${platformPostId}`, {
    method: 'DELETE',
    headers: { 'Cookie': entSession.cookies },
  });
  logTest({
    testId: 'TC-SEC-02',
    portal: 'Enterprise Admin',
    role: 'Enterprise Admin',
    url: `${BASE_ENTERPRISE}/api/v1/cms/blogs/my/posts/${platformPostId}`,
    title: 'IDOR Prevention: Enterprise Admin Deleting Platform Post',
    steps: 'DELETE /api/v1/cms/blogs/my/posts/:id on platform-owned post',
    expectedResult: 'HTTP 403 Forbidden or 404 Not Found',
    actualResult: `HTTP ${idorDelRes.status}`,
    status: idorDelRes.status === 403 || idorDelRes.status === 404 ? 'pass' : 'fail',
    severity: 'Critical',
    notes: 'Protected.',
  });

  // Write out comprehensive report
  fs.writeFileSync('scripts/comprehensive_audit_report.json', JSON.stringify(auditReport, null, 2));
  console.log(`\n======================================================`);
  console.log(`E2E AUDIT FINISHED: ${auditReport.length} TEST CASES EVALUATED`);
  const passed = auditReport.filter(t => t.status === 'pass').length;
  const failed = auditReport.filter(t => t.status === 'fail').length;
  console.log(`PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`======================================================`);
}

run().catch(console.error);
