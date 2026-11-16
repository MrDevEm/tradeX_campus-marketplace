import { isApiConfigured } from '../config/env';
import { authService } from '../services/api';
import type { AuthTab } from '../types/marketplace';

export function initAuth(): void {
  const modalAuth = document.getElementById('modal-auth');
  const btnLogin = document.getElementById('btn-login');
  const btnSignup = document.getElementById('btn-signup');
  const btnCloseAuth = document.getElementById('btn-close-auth');
  const tabLogin = document.getElementById('tab-login') as HTMLButtonElement | null;
  const tabRegister = document.getElementById('tab-register') as HTMLButtonElement | null;
  const tabVerify = document.getElementById('tab-verify') as HTMLButtonElement | null;
  const formLogin = document.getElementById('form-login') as HTMLFormElement | null;
  const formRegister = document.getElementById('form-register') as HTMLFormElement | null;
  const verifyScreen = document.getElementById('verify-screen');
  const authTitle = document.getElementById('auth-modal-title');
  const btnCloseVerify = document.getElementById('btn-close-verify-screen');

  function setAuthTab(tab: AuthTab): void {
    if (!formLogin || !formRegister || !verifyScreen || !authTitle || !tabLogin || !tabRegister || !tabVerify) {
      return;
    }
    const activeBg = 'linear-gradient(135deg, #06D6A0 0%, #05BA8B 100%)';
    const activeColor = '#061712';
    const inactiveColor = '#356356';

    if (tab === 'login') {
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
      verifyScreen.style.display = 'none';
      authTitle.textContent = 'Student Sign In';
      tabLogin.style.background = activeBg;
      tabLogin.style.color = activeColor;
      tabLogin.style.fontWeight = '700';
      tabRegister.style.background = 'transparent';
      tabRegister.style.color = inactiveColor;
      tabRegister.style.fontWeight = '600';
      tabVerify.style.background = 'transparent';
      tabVerify.style.color = inactiveColor;
      tabVerify.style.fontWeight = '600';
    } else if (tab === 'register') {
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
      verifyScreen.style.display = 'none';
      authTitle.textContent = 'Create Student Account';
      tabRegister.style.background = activeBg;
      tabRegister.style.color = activeColor;
      tabRegister.style.fontWeight = '700';
      tabLogin.style.background = 'transparent';
      tabLogin.style.color = inactiveColor;
      tabLogin.style.fontWeight = '600';
      tabVerify.style.background = 'transparent';
      tabVerify.style.color = inactiveColor;
      tabVerify.style.fontWeight = '600';
    } else {
      formLogin.style.display = 'none';
      formRegister.style.display = 'none';
      verifyScreen.style.display = 'block';
      authTitle.textContent = 'Identity Verification';
      tabVerify.style.background = activeBg;
      tabVerify.style.color = activeColor;
      tabVerify.style.fontWeight = '700';
      tabLogin.style.background = 'transparent';
      tabLogin.style.color = inactiveColor;
      tabLogin.style.fontWeight = '600';
      tabRegister.style.background = 'transparent';
      tabRegister.style.color = inactiveColor;
      tabRegister.style.fontWeight = '600';

      if (isApiConfigured()) {
        void authService.getVerificationStatus().catch(() => {
          // Verification status fetch failed; preserve existing screen without breaking UI.
        });
      }
    }
  }

  btnLogin?.addEventListener('click', () => {
    setAuthTab('login');
    modalAuth?.classList.add('is-open');
  });

  btnSignup?.addEventListener('click', () => {
    setAuthTab('register');
    modalAuth?.classList.add('is-open');
  });

  btnCloseAuth?.addEventListener('click', () => {
    modalAuth?.classList.remove('is-open');
  });

  tabLogin?.addEventListener('click', () => setAuthTab('login'));
  tabRegister?.addEventListener('click', () => setAuthTab('register'));
  tabVerify?.addEventListener('click', () => setAuthTab('verify'));

  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = formLogin.querySelector<HTMLInputElement>('input[type="email"]');
    const passwordInput = formLogin.querySelector<HTMLInputElement>('input[type="password"]');
    const submitBtn = formLogin.querySelector<HTMLButtonElement>('button[type="submit"]');

    if (isApiConfigured()) {
      if (submitBtn) submitBtn.disabled = true;
      try {
        await authService.login({
          email: emailInput?.value.trim() ?? '',
          password: passwordInput?.value ?? '',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to sign in right now.';
        window.alert(message);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
      if (submitBtn) submitBtn.disabled = false;
    }

    modalAuth?.classList.remove('is-open');
    window.alert('Welcome back, Dawit! You are signed in as a verified campus student.');
  });

  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = formRegister.querySelectorAll<HTMLInputElement>('input');
    const yearSelect = formRegister.querySelector<HTMLSelectElement>('select');
    const submitBtn = formRegister.querySelector<HTMLButtonElement>('button[type="submit"]');

    if (isApiConfigured()) {
      if (submitBtn) submitBtn.disabled = true;
      try {
        await authService.register({
          fullName: inputs[0]?.value.trim() ?? '',
          studentId: inputs[1]?.value.trim() ?? '',
          academicYear: yearSelect?.value ?? '1st Year',
          department: inputs[2]?.value.trim() ?? '',
          email: inputs[3]?.value.trim() ?? '',
          password: inputs[4]?.value ?? '',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create account right now.';
        window.alert(message);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
      if (submitBtn) submitBtn.disabled = false;
    }

    setAuthTab('verify');
  });

  btnCloseVerify?.addEventListener('click', () => {
    modalAuth?.classList.remove('is-open');
  });
}
