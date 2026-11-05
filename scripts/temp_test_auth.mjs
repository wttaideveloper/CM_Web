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
  if (!formMatch) {
    console.log('No form action found');
    return;
  }
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
  console.log('Keycloak redirect to callbackUrl:', callbackUrl);

  // Now call callbackUrl
  const r4 = await fetch(callbackUrl, {
    redirect: 'manual',
    headers: {
      'Cookie': backendCookies1.map(c => c.split(';')[0]).join('; ')
    }
  });

  console.log('Callback status:', r4.status);
  const callbackLocation = r4.headers.get('location');
  console.log('Callback location:', callbackLocation);
  const callbackCookies = r4.headers.getSetCookie();

  const validateUrl = new URL(callbackLocation);
  const sessionCode = validateUrl.searchParams.get('he_session_code');
  console.log('Extracted sessionCode:', sessionCode);

  // Complete login on port 3000
  const completeRes = await fetch(`http://localhost:3000/api/v1/auth/complete-login?sessionCode=${sessionCode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': callbackCookies.map(c => c.split(';')[0]).join('; ')
    },
    body: JSON.stringify({ sessionCode })
  });

  console.log('Complete-login status:', completeRes.status);
  const completeBody = await completeRes.json();
  console.log('Complete-login body:', completeBody);
  const sessionCookies = completeRes.headers.getSetCookie();
  console.log('Session cookies from complete-login:', sessionCookies);

  // Now test calling /api/v1/cms/blogs/manage on port 3001 using these session cookies!
  const cookieHeader = sessionCookies.map(c => c.split(';')[0]).join('; ');
  const blogRes = await fetch('http://localhost:3001/api/v1/cms/blogs/manage', {
    headers: {
      'Cookie': cookieHeader,
      'Accept': 'application/json'
    }
  });
  console.log('Enterprise Admin /api/v1/cms/blogs/manage status:', blogRes.status);
  const blogData = await blogRes.text();
  console.log('Enterprise Admin blogs response:', blogData.slice(0, 500));
}

run().catch(console.error);
