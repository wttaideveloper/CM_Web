import fs from 'fs';

async function testUploads() {
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

  // 1. Upload valid image
  const validBlob = new Blob([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], { type: 'image/png' });
  const form1 = new FormData();
  form1.append('file', validBlob, 'test.png');
  form1.append('purpose', 'cover_image');

  const res1 = await fetch('http://localhost:3001/api/v1/cms/blogs/uploads', {
    method: 'POST',
    headers: { 'Cookie': cookieHeader },
    body: form1
  });
  console.log('Upload valid PNG status:', res1.status);
  console.log('Upload valid PNG body:', await res1.text());

  // 2. Upload dangerous executable file
  const exeBlob = new Blob(['MZ\x90\x00\x03\x00\x00\x00'], { type: 'application/x-msdownload' });
  const form2 = new FormData();
  form2.append('file', exeBlob, 'malicious.exe');
  form2.append('purpose', 'cover_image');

  const res2 = await fetch('http://localhost:3001/api/v1/cms/blogs/uploads', {
    method: 'POST',
    headers: { 'Cookie': cookieHeader },
    body: form2
  });
  console.log('Upload EXE status:', res2.status);
  console.log('Upload EXE body:', await res2.text());

  // 3. Upload SVG file (potential XSS vector)
  const svgBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' });
  const form3 = new FormData();
  form3.append('file', svgBlob, 'xss.svg');
  form3.append('purpose', 'cover_image');

  const res3 = await fetch('http://localhost:3001/api/v1/cms/blogs/uploads', {
    method: 'POST',
    headers: { 'Cookie': cookieHeader },
    body: form3
  });
  console.log('Upload SVG status:', res3.status);
  console.log('Upload SVG body:', await res3.text());
}

testUploads().catch(console.error);
