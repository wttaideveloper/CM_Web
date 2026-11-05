async function run() {
  const returnTo = '/auth/validate?return_to=' + encodeURIComponent('http://localhost:3001/admin/blogs');
  const startUrl = `http://localhost:3000/api/v1/auth/login?module=enterprise&frontend_origin=http://localhost:3000&return_to=${encodeURIComponent(returnTo)}&rememberMe=true`;
  const r1 = await fetch(startUrl, { redirect: 'manual' });
  const keycloakUrl = r1.headers.get('location');
  const backendCookies1 = r1.headers.getSetCookie();

  const r2 = await fetch(keycloakUrl);
  const kcCookies = r2.headers.getSetCookie();
  const html = await r2.text();

  const formMatch = html.match(/action="([^"]+)"/i);
  const formAction = formMatch[1].replace(/&amp;/g, '&');

  const kcCookieHeader = kcCookies.map(c => c.split(';')[0]).join('; ');
  const postParams = new URLSearchParams({
    username: 'petersnolan53@gmail.com',
    password: 'Hakeem@12',
    rememberMe: 'on'
  });

  const r3 = await fetch(formAction, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': kcCookieHeader
    },
    body: postParams.toString(),
    redirect: 'manual'
  });

  const callbackUrl = r3.headers.get('location');
  const r4 = await fetch(callbackUrl, {
    redirect: 'manual',
    headers: { 'Cookie': backendCookies1.map(c => c.split(';')[0]).join('; ') }
  });

  const callbackLocation = r4.headers.get('location');
  const callbackCookies = r4.headers.getSetCookie();
  const validateUrl = new URL(callbackLocation);
  const sessionCode = validateUrl.searchParams.get('he_session_code');

  const completeRes = await fetch(`http://localhost:3000/api/v1/auth/complete-login?sessionCode=${sessionCode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': callbackCookies.map(c => c.split(';')[0]).join('; ')
    },
    body: JSON.stringify({ sessionCode })
  });

  const sessionCookies = completeRes.headers.getSetCookie();
  const cookieHeader = sessionCookies.map(c => c.split(';')[0]).join('; ');

  // Fetch active form with ?kind=blog
  const formRes = await fetch('http://localhost:3001/api/v1/cms/blogs/my/form?kind=blog', {
    headers: { 'Cookie': cookieHeader }
  });
  console.log('Form status with kind=blog:', formRes.status);
  const formData = await formRes.json().catch(() => null);
  console.log('Form data:', JSON.stringify(formData, null, 2));

  // Category
  const catRes = await fetch('http://localhost:3001/api/v1/cms/blogs/categories');
  const catData = await catRes.json();
  const cat = Array.isArray(catData) ? catData[0] : catData.items?.[0];

  const payload = {
    kind: 'blog',
    title: 'QA Test Audit Post ' + Date.now(),
    excerpt: 'Short excerpt for audit test',
    content: '<p>Content for audit verification</p>',
    category_id: cat ? cat.id : null,
    cover_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
    custom_fields: { post_type: 'blog' },
    form_id: formData?.id ?? null,
    form_version: formData?.version ?? null,
    module: 'general'
  };

  const createRes = await fetch('http://localhost:3001/api/v1/cms/blogs/my/posts', {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('Create status (without tags):', createRes.status);
  const createBody = await createRes.text();
  console.log('Create body:', createBody);
}

run().catch(console.error);
