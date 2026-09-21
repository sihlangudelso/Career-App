let AUTH_MODE = 'signin'; // 'signin' | 'signup' | 'reset'
let AUTH_ERROR = '';
let AUTH_BUSY = false;
let AUTH_SHOW_RESET = false;

function friendlyAuthError(err){
  const msg = (err && err.message) || '';
  if(/already registered|already exists/i.test(msg)) return 'An account already exists with that email — try signing in.';
  if(/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
  if(/password.*(least|characters|weak)/i.test(msg)) return 'Please use at least 6 characters for your password.';
  if(/rate limit|too many/i.test(msg)) return 'Too many attempts — please wait a moment and try again.';
  if(/email.*invalid|invalid.*email/i.test(msg)) return 'That email address doesn\u2019t look right.';
  if(/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox for a link.';
  return msg || 'Something went wrong — please try again.';
}

function viewAuthGate(){
  if(SUPABASE_NOT_CONFIGURED){
    return `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div class="card" style="max-width:460px;">
        <div class="brand-mark" style="margin-bottom:14px;">I</div>
        <h2>Supabase isn\u2019t configured yet</h2>
        <p class="page-sub">Open <code>js/supabase-config.js</code> and replace the placeholder values with your Supabase project\u2019s URL and anon key (Project Settings → API). Then run <code>supabase/schema.sql</code> in the SQL editor. See README.md Phase 1.</p>
      </div>
    </div>`;
  }
  return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div class="card" style="max-width:420px;width:100%;">
      <div style="text-align:center;margin-bottom:18px;">
        <div class="brand-mark" style="margin:0 auto 12px;width:52px;height:52px;font-size:22px;">I</div>
        <h1 style="font-size:22px;">Iroli Career Pathway</h1>
        <p class="page-sub" style="margin:0 auto;">${AUTH_MODE==='signup' ? 'Create your account' : AUTH_MODE==='reset' ? 'Reset your password' : 'Sign in to continue'}</p>
      </div>
      ${AUTH_ERROR ? `<div class="disclaimer" style="margin-bottom:14px;">${icon('warn','ic')}<div>${esc(AUTH_ERROR)}${AUTH_SHOW_RESET ? ` <a href="#" onclick="App.setAuthMode('reset');return false;">Reset your password</a>` : ''}</div></div>` : ''}
      ${AUTH_MODE==='signup' ? `
        <div class="form-row"><label>Your name</label><input type="text" id="auth_name" placeholder="Thabo Mokoena" onkeydown="if(event.key==='Enter')App.authSubmitOnEnter()"/></div>
      ` : ''}
      <div class="form-row"><label>Email</label><input type="text" id="auth_email" placeholder="you@example.com" onkeydown="if(event.key==='Enter')App.authSubmitOnEnter()"/></div>
      ${AUTH_MODE!=='reset' ? `<div class="form-row"><label>Password</label><input type="password" id="auth_pass" placeholder="At least 6 characters" onkeydown="if(event.key==='Enter')App.authSubmitOnEnter()"/></div>` : ''}

      ${AUTH_MODE==='signin' ? `
        <button class="btn btn-primary" style="width:100%;" ${AUTH_BUSY?'disabled':''} onclick="App.authSignIn()">${AUTH_BUSY?'Signing in…':'Sign in'}</button>
        <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:12.5px;">
          <a href="#" onclick="App.setAuthMode('signup');return false;">Create an account</a>
          <a href="#" onclick="App.setAuthMode('reset');return false;">Forgot password?</a>
        </div>
      ` : AUTH_MODE==='signup' ? `
        <button class="btn btn-primary" style="width:100%;" ${AUTH_BUSY?'disabled':''} onclick="App.authSignUp()">${AUTH_BUSY?'Creating account…':'Create account'}</button>
        <div style="text-align:center;margin-top:12px;font-size:12.5px;"><a href="#" onclick="App.setAuthMode('signin');return false;">Already have an account? Sign in</a></div>
      ` : `
        <button class="btn btn-primary" style="width:100%;" ${AUTH_BUSY?'disabled':''} onclick="App.authReset()">${AUTH_BUSY?'Sending…':'Send reset email'}</button>
        <div style="text-align:center;margin-top:12px;font-size:12.5px;"><a href="#" onclick="App.setAuthMode('signin');return false;">Back to sign in</a></div>
      `}

      <div style="display:flex;align-items:center;gap:10px;margin:18px 0;color:var(--muted);font-size:12px;">
        <div style="flex:1;height:1px;background:var(--line);"></div>or<div style="flex:1;height:1px;background:var(--line);"></div>
      </div>
      <button class="btn btn-ghost" style="width:100%;" ${AUTH_BUSY?'disabled':''} onclick="App.authGoogle()">Continue with Google</button>

      <p style="font-size:11.5px;color:var(--muted);margin-top:18px;text-align:center;">By continuing you agree this tool provides career guidance only — always verify admission requirements with the institution directly. See our <a href="privacy.html" target="_blank" rel="noopener">Privacy Notice</a> and <a href="pricing.html" target="_blank" rel="noopener">Pricing</a>.</p>
    </div>
  </div>`;
}

function viewSetNewPassword(){
  return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div class="card" style="max-width:420px;width:100%;">
      <div style="text-align:center;margin-bottom:18px;">
        <div class="brand-mark" style="margin:0 auto 12px;width:52px;height:52px;font-size:22px;">I</div>
        <h1 style="font-size:22px;">Set a new password</h1>
        <p class="page-sub" style="margin:0 auto;">Choose a new password for ${esc(ME.email||'your account')}.</p>
      </div>
      ${AUTH_ERROR ? `<div class="disclaimer" style="margin-bottom:14px;">${icon('warn','ic')}<div>${esc(AUTH_ERROR)}</div></div>` : ''}
      <div class="form-row"><label>New password</label><input type="password" id="newpass1" placeholder="At least 6 characters" onkeydown="if(event.key==='Enter')App.authUpdatePassword()"/></div>
      <div class="form-row"><label>Confirm new password</label><input type="password" id="newpass2" placeholder="Re-enter your new password" onkeydown="if(event.key==='Enter')App.authUpdatePassword()"/></div>
      <button class="btn btn-primary" style="width:100%;" ${AUTH_BUSY?'disabled':''} onclick="App.authUpdatePassword()">${AUTH_BUSY?'Updating…':'Update password'}</button>
      <div style="text-align:center;margin-top:14px;font-size:12.5px;"><a href="#" onclick="App.cancelRecovery();return false;">Cancel and sign in instead</a></div>
    </div>
  </div>`;
}
