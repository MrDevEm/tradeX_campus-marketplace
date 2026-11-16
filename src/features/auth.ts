import { isApiConfigured } from '../config/env';
import { authService } from '../services/api';
import type { AuthTab, AuthUser, UserStatus } from '../types/marketplace';

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
  const verifyOtpScreen = document.getElementById('verify-otp-screen');
  const uploadIdScreen = document.getElementById('upload-id-screen');
  const verifyScreen = document.getElementById('verify-screen');
  const authTitle = document.getElementById('auth-modal-title');
  const btnCloseVerify = document.getElementById('btn-close-verify-screen');

  // OTP elements
  const formVerifyOtp = document.getElementById('form-verify-otp') as HTMLFormElement | null;
  const otpInputs = Array.from(document.querySelectorAll<HTMLInputElement>('.otp-digit-input'));
  const otpTargetEmail = document.getElementById('otp-target-email');
  const otpTimerDisplay = document.getElementById('otp-timer-display');
  const btnResendOtp = document.getElementById('btn-resend-otp') as HTMLButtonElement | null;
  const btnBackToRegister = document.getElementById('btn-back-to-register');

  // ID Upload elements
  const formUploadId = document.getElementById('form-upload-id') as HTMLFormElement | null;
  const idImageDropzone = document.getElementById('id-image-dropzone');
  const idImageFile = document.getElementById('id-image-file') as HTMLInputElement | null;
  const idImagePreviewWrap = document.getElementById('id-image-preview-wrap');
  const idImagePreview = document.getElementById('id-image-preview') as HTMLImageElement | null;
  const idImageLabel = document.getElementById('id-image-label');
  const btnRemoveIdImage = document.getElementById('btn-remove-id-image');
  const btnSubmitIdUpload = document.getElementById('btn-submit-id-upload') as HTMLButtonElement | null;
  const btnSkipIdUpload = document.getElementById('btn-skip-id-upload');
  const btnReuploadId = document.getElementById('btn-reupload-id');

  // Verification status elements
  const verifyStatusIconWrap = document.getElementById('verify-status-icon-wrap');
  const verifyStatusHeading = document.getElementById('verify-status-heading');
  const verifyStatusDesc = document.getElementById('verify-status-desc');
  const verifyInfoBadge = document.getElementById('verify-info-badge');
  const verifyInfoOtp = document.getElementById('verify-info-otp');
  const verifyInfoId = document.getElementById('verify-info-id');
  const verifyRejectionRow = document.getElementById('verify-rejection-row');
  const verifyInfoRejection = document.getElementById('verify-info-rejection');

  let pendingRegistrationEmail = '';
  let uploadedIdImageDataUrl = '';
  let otpCountdownSeconds = 300; // 5 minutes
  let resendCooldownSeconds = 60; // 60 seconds
  let otpInterval: number | undefined;
  let resendInterval: number | undefined;

  function setAuthTab(tab: AuthTab): void {
    if (!formLogin || !formRegister || !verifyOtpScreen || !uploadIdScreen || !verifyScreen || !authTitle || !tabLogin || !tabRegister || !tabVerify) {
      return;
    }
    const activeBg = 'linear-gradient(135deg, #06D6A0 0%, #05BA8B 100%)';
    const activeColor = '#061712';
    const inactiveColor = '#356356';

    const hideAll = () => {
      formLogin.style.display = 'none';
      formRegister.style.display = 'none';
      verifyOtpScreen.style.display = 'none';
      uploadIdScreen.style.display = 'none';
      verifyScreen.style.display = 'none';
    };

    const resetTabs = () => {
      [tabLogin, tabRegister, tabVerify].forEach((t) => {
        t.style.background = 'transparent';
        t.style.color = inactiveColor;
        t.style.fontWeight = '600';
      });
    };

    hideAll();
    resetTabs();

    if (tab === 'login') {
      formLogin.style.display = 'block';
      authTitle.textContent = 'Student Sign In';
      tabLogin.style.background = activeBg;
      tabLogin.style.color = activeColor;
      tabLogin.style.fontWeight = '700';
    } else if (tab === 'register') {
      formRegister.style.display = 'block';
      authTitle.textContent = 'Create Student Account';
      tabRegister.style.background = activeBg;
      tabRegister.style.color = activeColor;
      tabRegister.style.fontWeight = '700';
    } else if (tab === 'otp') {
      verifyOtpScreen.style.display = 'block';
      authTitle.textContent = 'Verify University Email';
      tabRegister.style.background = activeBg;
      tabRegister.style.color = activeColor;
      tabRegister.style.fontWeight = '700';
      startOtpTimers();
      otpInputs[0]?.focus();
    } else if (tab === 'upload-id') {
      uploadIdScreen.style.display = 'block';
      authTitle.textContent = 'Upload Student ID Card';
      tabVerify.style.background = activeBg;
      tabVerify.style.color = activeColor;
      tabVerify.style.fontWeight = '700';
    } else {
      verifyScreen.style.display = 'block';
      authTitle.textContent = 'Identity Verification Status';
      tabVerify.style.background = activeBg;
      tabVerify.style.color = activeColor;
      tabVerify.style.fontWeight = '700';
      renderVerificationStatusView();
    }
  }

  function startOtpTimers(): void {
    window.clearInterval(otpInterval);
    window.clearInterval(resendInterval);

    otpCountdownSeconds = 300;
    resendCooldownSeconds = 60;

    const updateTimerDisplay = () => {
      const mins = Math.floor(otpCountdownSeconds / 60);
      const secs = otpCountdownSeconds % 60;
      if (otpTimerDisplay) {
        otpTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    };
    updateTimerDisplay();

    otpInterval = window.setInterval(() => {
      if (otpCountdownSeconds > 0) {
        otpCountdownSeconds -= 1;
        updateTimerDisplay();
      } else {
        window.clearInterval(otpInterval);
        if (otpTimerDisplay) otpTimerDisplay.textContent = 'Expired';
      }
    }, 1000);

    if (btnResendOtp) {
      btnResendOtp.disabled = true;
      btnResendOtp.textContent = `Resend Code (${resendCooldownSeconds}s)`;
    }

    resendInterval = window.setInterval(() => {
      if (resendCooldownSeconds > 0) {
        resendCooldownSeconds -= 1;
        if (btnResendOtp) btnResendOtp.textContent = `Resend Code (${resendCooldownSeconds}s)`;
      } else {
        window.clearInterval(resendInterval);
        if (btnResendOtp) {
          btnResendOtp.disabled = false;
          btnResendOtp.textContent = 'Resend Code';
        }
      }
    }, 1000);
  }

  function renderVerificationStatusView(): void {
    const user = authService.getCurrentUser();
    const status: UserStatus = user?.status || 'APPROVED';

    if (verifyStatusHeading && verifyStatusDesc && verifyInfoBadge && verifyInfoOtp && verifyInfoId) {
      if (status === 'APPROVED') {
        if (verifyStatusIconWrap) {
          verifyStatusIconWrap.style.background = 'var(--polar-500)';
          verifyStatusIconWrap.style.color = 'var(--emerald-700)';
          verifyStatusIconWrap.innerHTML =
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        }
        verifyStatusHeading.textContent = 'Identity Verified';
        verifyStatusDesc.textContent =
          'Your student ID is verified for the current semester. You have full permissions to post listings, message peers, and participate in campus exchanges.';
        verifyInfoBadge.textContent = 'Verified Student';
        verifyInfoBadge.style.color = 'var(--emerald-700)';
        verifyInfoOtp.textContent = 'Confirmed';
        verifyInfoOtp.style.color = 'var(--emerald-700)';
        verifyInfoId.textContent = 'Approved';
        verifyInfoId.style.color = 'var(--emerald-700)';
        if (verifyRejectionRow) verifyRejectionRow.style.display = 'none';
        if (btnReuploadId) btnReuploadId.style.display = 'none';
      } else if (status === 'PENDING_APPROVAL') {
        if (verifyStatusIconWrap) {
          verifyStatusIconWrap.style.background = '#FEF3C7';
          verifyStatusIconWrap.style.color = '#B45309';
          verifyStatusIconWrap.innerHTML =
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        }
        verifyStatusHeading.textContent = 'Verification In Review';
        verifyStatusDesc.textContent =
          'Your student ID has been received and is currently in the administrative review queue. Full marketplace publishing and messaging unlock as soon as campus administration approves your card.';
        verifyInfoBadge.textContent = 'Pending Review';
        verifyInfoBadge.style.color = '#B45309';
        verifyInfoOtp.textContent = 'Confirmed';
        verifyInfoOtp.style.color = 'var(--emerald-700)';
        verifyInfoId.textContent = 'Uploaded (Under Review)';
        verifyInfoId.style.color = '#B45309';
        if (verifyRejectionRow) verifyRejectionRow.style.display = 'none';
        if (btnReuploadId) btnReuploadId.style.display = 'none';
      } else if (status === 'REJECTED') {
        if (verifyStatusIconWrap) {
          verifyStatusIconWrap.style.background = '#FEE2E2';
          verifyStatusIconWrap.style.color = '#DC2626';
          verifyStatusIconWrap.innerHTML =
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        }
        verifyStatusHeading.textContent = 'Resubmission Requested';
        verifyStatusDesc.textContent =
          'Your student ID card scan could not be verified by campus administration. Please review the reason below and submit a clear, well-lit photo of your valid ID.';
        verifyInfoBadge.textContent = 'Action Required';
        verifyInfoBadge.style.color = '#DC2626';
        verifyInfoOtp.textContent = 'Confirmed';
        verifyInfoOtp.style.color = 'var(--emerald-700)';
        verifyInfoId.textContent = 'Rejected';
        verifyInfoId.style.color = '#DC2626';
        if (verifyRejectionRow) {
          verifyRejectionRow.style.display = 'flex';
          if (verifyInfoRejection) {
            verifyInfoRejection.textContent = user?.rejectionReason || 'Please upload a readable ID card photo';
          }
        }
        if (btnReuploadId) {
          btnReuploadId.style.display = 'block';
          btnReuploadId.textContent = 'Upload New Student ID Scan';
        }
      } else {
        // PENDING_UPLOAD or PENDING_EMAIL
        if (verifyStatusIconWrap) {
          verifyStatusIconWrap.style.background = '#E0F2FE';
          verifyStatusIconWrap.style.color = '#0284C7';
          verifyStatusIconWrap.innerHTML =
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line></svg>';
        }
        verifyStatusHeading.textContent = 'Student ID Required';
        verifyStatusDesc.textContent =
          'Your university email is verified. Please upload your student ID card to earn your verified badge and begin trading.';
        verifyInfoBadge.textContent = 'Pending ID Upload';
        verifyInfoBadge.style.color = '#0284C7';
        verifyInfoOtp.textContent = 'Confirmed';
        verifyInfoOtp.style.color = 'var(--emerald-700)';
        verifyInfoId.textContent = 'Not Uploaded';
        verifyInfoId.style.color = '#0284C7';
        if (verifyRejectionRow) verifyRejectionRow.style.display = 'none';
        if (btnReuploadId) {
          btnReuploadId.style.display = 'block';
          btnReuploadId.textContent = 'Upload Student ID Card Now';
        }
      }
    }
  }

  // Handle 6-digit OTP inputs
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value.replace(/\D/g, '');
      input.value = val ? val.slice(-1) : '';
      if (val && idx < otpInputs.length - 1) {
        otpInputs[idx + 1]?.focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        otpInputs[idx - 1]?.focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || '';
      if (!pasteData) return;
      pasteData.split('').forEach((char, pIdx) => {
        if (otpInputs[pIdx]) otpInputs[pIdx]!.value = char;
      });
      const nextFocus = Math.min(pasteData.length, otpInputs.length - 1);
      otpInputs[nextFocus]?.focus();
    });
  });

  // Handle ID image file selection
  function updateIdImagePreview(src: string, label: string): void {
    if (!idImagePreview || !idImagePreviewWrap) return;
    if (src) {
      idImagePreview.src = src;
      idImagePreviewWrap.classList.add('has-image');
      if (idImageLabel && label) idImageLabel.textContent = label;
      if (btnSubmitIdUpload) btnSubmitIdUpload.disabled = false;
    } else {
      idImagePreview.removeAttribute('src');
      idImagePreviewWrap.classList.remove('has-image');
      if (idImageLabel) idImageLabel.textContent = 'Click or drag student ID card photo here';
      if (btnSubmitIdUpload) btnSubmitIdUpload.disabled = true;
    }
  }

  function handleIdFile(file: File | undefined | null): void {
    if (!file || !file.type.startsWith('image/')) {
      window.alert('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('File size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result;
      uploadedIdImageDataUrl = typeof res === 'string' ? res : '';
      if (uploadedIdImageDataUrl) {
        updateIdImagePreview(uploadedIdImageDataUrl, file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  idImageFile?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    handleIdFile(input.files?.[0]);
  });

  if (idImageDropzone) {
    ['dragenter', 'dragover'].forEach((evt) => {
      idImageDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        idImageDropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      idImageDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        idImageDropzone.classList.remove('is-dragover');
      });
    });
    idImageDropzone.addEventListener('drop', (e) => {
      const dragEvent = e as DragEvent;
      handleIdFile(dragEvent.dataTransfer?.files?.[0]);
    });
  }

  btnRemoveIdImage?.addEventListener('click', () => {
    uploadedIdImageDataUrl = '';
    if (idImageFile) idImageFile.value = '';
    updateIdImagePreview('', '');
  });

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

    if (submitBtn) submitBtn.disabled = true;
    try {
      const session = await authService.login({
        email: emailInput?.value.trim() ?? '',
        password: passwordInput?.value ?? '',
      });
      modalAuth?.classList.remove('is-open');
      const name = session?.user?.fullName || 'Student';
      window.alert(`Welcome back, ${name}! You are signed in.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in right now.';
      window.alert(message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = formRegister.querySelectorAll<HTMLInputElement>('input');
    const yearSelect = formRegister.querySelector<HTMLSelectElement>('select');
    const submitBtn = formRegister.querySelector<HTMLButtonElement>('button[type="submit"]');

    const fullName = inputs[0]?.value.trim() ?? '';
    const studentId = inputs[1]?.value.trim() ?? '';
    const academicYear = yearSelect?.value ?? '1st Year';
    const department = inputs[2]?.value.trim() ?? '';
    const email = inputs[3]?.value.trim() ?? '';
    const password = inputs[4]?.value ?? '';

    // University email validation
    if (!email.toLowerCase().includes('.edu') && !email.toLowerCase().includes('@mu.edu.et')) {
      window.alert('Please enter an official university email address ending in .edu or campus domain.');
      return;
    }

    pendingRegistrationEmail = email;
    if (otpTargetEmail) otpTargetEmail.textContent = email;

    if (submitBtn) submitBtn.disabled = true;
    try {
      await authService.register({
        fullName,
        studentId,
        academicYear,
        department,
        email,
        password,
      });
      setAuthTab('otp');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register right now.';
      window.alert(message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  formVerifyOtp?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otpCode = otpInputs.map((i) => i.value).join('');
    if (otpCode.length < 6) {
      window.alert('Please enter all 6 digits of your verification code.');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-otp') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = true;

    try {
      await authService.verifyEmail({
        email: pendingRegistrationEmail || 'student@university.edu',
        otp: otpCode,
      });
      setAuthTab('upload-id');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification code incorrect or expired.';
      window.alert(message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  btnResendOtp?.addEventListener('click', async () => {
    if (!pendingRegistrationEmail) return;
    try {
      const res = await authService.resendOtp(pendingRegistrationEmail);
      startOtpTimers();
      window.alert(res.message);
    } catch {
      window.alert('Unable to resend OTP code right now. Please try again shortly.');
    }
  });

  btnBackToRegister?.addEventListener('click', () => {
    setAuthTab('register');
  });

  formUploadId?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!uploadedIdImageDataUrl) {
      window.alert('Please select a student ID photo before submitting.');
      return;
    }

    if (btnSubmitIdUpload) btnSubmitIdUpload.disabled = true;
    try {
      await authService.uploadStudentId({
        idDocumentDataUrl: uploadedIdImageDataUrl,
      });
      setAuthTab('verify');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload student ID right now.';
      window.alert(message);
    } finally {
      if (btnSubmitIdUpload) btnSubmitIdUpload.disabled = false;
    }
  });

  btnSkipIdUpload?.addEventListener('click', () => {
    setAuthTab('verify');
  });

  btnReuploadId?.addEventListener('click', () => {
    setAuthTab('upload-id');
  });

  btnCloseVerify?.addEventListener('click', () => {
    modalAuth?.classList.remove('is-open');
  });

  // Export helper to open ID verification status modal directly from anywhere
  (window as unknown as { openIdVerificationModal: () => void }).openIdVerificationModal = () => {
    setAuthTab('verify');
    modalAuth?.classList.add('is-open');
  };
}