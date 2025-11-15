import { state, bindDom } from 'lume-js';
import { computed } from 'lume-js/addons';

// --- State ---
const form = state({
  personal: state({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  }),
  account: state({
    username: '',
    password: '',
    confirm: '',
    type: 'free',
  }),
  preferences: state({
    newsletter: false,
    billing: 'monthly',
    payment: 'credit',
    referral: '',
  }),
  terms: false,
});

const errors = state({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  username: '',
  password: '',
  confirm: '',
  terms: '',
});

const ui = state({
  currentStep: 1,
  usernameLoading: false,
  usernameAvailable: false,
  passwordStrength: '',
  passwordVisible: false,
  confirmVisible: false,
  submitted: false,
  touched: {}, // Track which fields have been touched
});

// --- DOM ---
const stepContent = document.getElementById('stepContent');
const stepper = document.getElementById('stepper');
const stepLabels = document.getElementById('stepLabels');
const multiForm = document.getElementById('multiForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

let cleanupBindDom = bindDom(document.body, { form });

// --- Validation Functions ---
function validateStep1() {
  const firstNameValid = form.personal.firstName.trim().length >= 2;
  const lastNameValid = form.personal.lastName.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal.email);
  
  errors.firstName = firstNameValid ? '' : 'First name must be at least 2 characters';
  errors.lastName = lastNameValid ? '' : 'Last name must be at least 2 characters';
  errors.email = emailValid ? '' : 'Please enter a valid email';
  // Phone is optional, only validate if provided
  errors.phone = '';
  
  return firstNameValid && lastNameValid && emailValid;
}

function validateStep2() {
  errors.username = form.account.username.trim().length < 5 ? 'Username must be at least 5 characters' : '';
  errors.password = form.account.password.length < 8 ? 'Password must be at least 8 characters' : '';
  errors.confirm = form.account.password !== form.account.confirm ? 'Passwords do not match' : '';
  const isValid = !errors.username && !errors.password && !errors.confirm;
  return isValid;
}

function validateStep4() {
  errors.terms = !form.terms ? 'You must agree to the terms' : '';
  return !errors.terms;
}

function isStepValid(step) {
  if (step === 1) return validateStep1();
  if (step === 2) return validateStep2();
  if (step === 3) return true; // Preferences are optional
  if (step === 4) return validateStep4();
  return true;
}

// --- Password Strength ---
function calculatePasswordStrength(password) {
  if (!password) return '';
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

// --- Username Availability Mock ---
async function checkUsernameAvailability(username) {
  if (username.length < 5) {
    ui.usernameAvailable = false;
    return;
  }
  
  ui.usernameLoading = true;
  ui.usernameAvailable = false;
  errors.username = '';
  
  // Randomize API delay (1-3 seconds)
  const delay = Math.random() * 2000 + 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Randomize availability (60% available, 40% taken)
  const isAvailable = Math.random() > 0.4;
  
  if (isAvailable) {
    errors.username = '';
    ui.usernameAvailable = true;
  } else {
    errors.username = 'Username is already taken';
    ui.usernameAvailable = false;
  }
  
  ui.usernameLoading = false;
  updateErrorDisplay();
  updateNextButton();
}

let usernameCheckTimeout;
function debouncedUsernameCheck(username) {
  clearTimeout(usernameCheckTimeout);
  usernameCheckTimeout = setTimeout(() => checkUsernameAvailability(username), 500);
}

// --- Rendering ---
function renderStepper() {
  stepper.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const div = document.createElement('div');
    div.className = 'step' + (ui.currentStep >= i ? ' active' : '');
    stepper.appendChild(div);
  }
  
  // Update labels
  const labels = stepLabels.querySelectorAll('span');
  labels.forEach((label, i) => {
    label.className = ui.currentStep === i + 1 ? 'active' : '';
  });
}



function updateErrorDisplay() {
  for (const key in errors) {
    const errorEl = document.getElementById(key + 'Error');
    if (errorEl) {
      // Only show error if field has been touched
      const shouldShow = ui.touched[key] && errors[key];
      errorEl.textContent = shouldShow ? errors[key] : '';
      const input = document.querySelector(`[name="${key}"]`) || document.getElementById(key);
      if (input && input.classList) {
        input.classList.toggle('error-field', !!shouldShow);
      }
    }
  }
  
  // Update username status (loading/available)
  const usernameStatusEl = document.getElementById('usernameStatus');
  if (usernameStatusEl) {
    if (ui.usernameLoading) {
      usernameStatusEl.textContent = 'Checking availability';
      usernameStatusEl.className = 'username-status loading';
    } else if (ui.usernameAvailable && form.account.username.length >= 5 && !errors.username) {
      usernameStatusEl.textContent = '✓ Username is available';
      usernameStatusEl.className = 'username-status available';
    } else {
      usernameStatusEl.textContent = '';
      usernameStatusEl.className = 'username-status';
    }
  }
  
  // Update username input icon
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.classList.toggle('input-success', ui.usernameAvailable && !errors.username);
  }
  
  // Update password strength
  const strengthEl = document.getElementById('passwordStrength');
  if (strengthEl) {
    const strength = ui.passwordStrength;
    if (strength) {
      strengthEl.innerHTML = `
        <div>Password strength: <strong>${strength}</strong></div>
        <div class="strength-bar"><div class="strength-fill ${strength}"></div></div>
      `;
    } else {
      strengthEl.innerHTML = '';
    }
  }
}

function renderStep() {
  if (ui.submitted) {
    renderSuccessMessage();
    return;
  }
  
  renderStepper();
  stepContent.innerHTML = '';
  prevBtn.style.display = ui.currentStep === 1 ? 'none' : '';
  prevBtn.setAttribute('aria-label', 'Go to previous step');
  nextBtn.classList.toggle('hidden', ui.currentStep === 4);
  nextBtn.setAttribute('aria-label', 'Go to next step');
  submitBtn.classList.toggle('hidden', ui.currentStep !== 4);
  submitBtn.setAttribute('aria-label', 'Submit registration form');

  let html = `<div class="step-container" role="region" aria-label="Step ${ui.currentStep} of 4">`;

  // Step 1: Personal Info
  if (ui.currentStep === 1) {
    html += `
      <div class="field-group">
        <label for="firstName">First Name *</label>
        <input 
          id="firstName" 
          name="firstName" 
          data-bind="form.personal.firstName" 
          required 
          aria-required="true"
          aria-invalid="${!!errors.firstName}"
          aria-describedby="firstNameError"
        />
        <span class="error" id="firstNameError" role="alert" aria-live="polite"></span>
      </div>
      <div class="field-group">
        <label for="lastName">Last Name *</label>
        <input 
          id="lastName" 
          name="lastName" 
          data-bind="form.personal.lastName" 
          required 
          aria-required="true"
          aria-invalid="${!!errors.lastName}"
          aria-describedby="lastNameError"
        />
        <span class="error" id="lastNameError" role="alert" aria-live="polite"></span>
      </div>
      <div class="field-group">
        <label for="email">
          Email *
          <span class="tooltip" tabindex="0" role="tooltip" aria-label="We'll never share your email">
            <span class="tooltip-icon" aria-hidden="true">?</span>
            <span class="tooltip-text">We'll never share your email</span>
          </span>
        </label>
        <input 
          id="email" 
          name="email" 
          type="email" 
          data-bind="form.personal.email" 
          required 
          aria-required="true"
          aria-invalid="${!!errors.email}"
          aria-describedby="emailError"
        />
        <span class="error" id="emailError" role="alert" aria-live="polite"></span>
      </div>
      <div class="field-group">
        <label for="phone">Phone (optional)</label>
        <input 
          id="phone" 
          name="phone" 
          type="tel" 
          data-bind="form.personal.phone" 
          placeholder="+1 (555) 123-4567"
          aria-invalid="${!!errors.phone}"
          aria-describedby="phoneError"
        />
        <span class="error" id="phoneError" role="alert" aria-live="polite"></span>
      </div>
    `;
  }
  // Step 2: Account Details
  else if (ui.currentStep === 2) {
    html += `
      <div class="field-group">
        <label for="username">
          Username *
          <span class="tooltip" tabindex="0" role="tooltip" aria-label="5+ characters, letters and numbers">
            <span class="tooltip-icon" aria-hidden="true">?</span>
            <span class="tooltip-text">5+ characters, letters and numbers</span>
          </span>
        </label>
        <div class="input-wrapper">
          <input 
            id="username" 
            name="username" 
            data-bind="form.account.username" 
            required 
            aria-required="true"
            aria-invalid="${!!errors.username}"
            aria-describedby="usernameStatus usernameError"
          />
          <span class="input-icon" id="usernameIcon"></span>
        </div>
        <span class="username-status" id="usernameStatus" aria-live="polite"></span>
        <span class="error" id="usernameError" role="alert" aria-live="polite"></span>
      </div>
      <div class="field-group">
        <label for="password">
          Password *
          <span class="tooltip" tabindex="0" role="tooltip" aria-label="8+ characters with uppercase, numbers, and symbols">
            <span class="tooltip-icon" aria-hidden="true">?</span>
            <span class="tooltip-text">8+ characters with uppercase, numbers, and symbols</span>
          </span>
        </label>
        <div class="input-wrapper">
          <input 
            id="password" 
            name="password" 
            type="${ui.passwordVisible ? 'text' : 'password'}" 
            data-bind="form.account.password" 
            required 
            aria-required="true"
            aria-invalid="${!!errors.password}"
            aria-describedby="passwordStrength passwordError"
          />
          <button type="button" class="toggle-password" id="togglePassword" aria-label="Toggle password visibility">
            ${ui.passwordVisible ? '🐵' : '🙈'}
          </button>
        </div>
        <div class="password-strength" id="passwordStrength" aria-live="polite"></div>
        <span class="error" id="passwordError" role="alert" aria-live="polite"></span>
      </div>
      <div class="field-group">
        <label for="confirm">Confirm Password *</label>
        <div class="input-wrapper">
          <input 
            id="confirm" 
            name="confirm" 
            type="${ui.confirmVisible ? 'text' : 'password'}" 
            data-bind="form.account.confirm" 
            required 
            aria-required="true"
            aria-invalid="${!!errors.confirm}"
            aria-describedby="confirmError"
          />
          <button type="button" class="toggle-password" id="toggleConfirm" aria-label="Toggle password visibility">
            ${ui.confirmVisible ? '🐵' : '🙈'}
          </button>
        </div>
        <span class="error" id="confirmError" role="alert" aria-live="polite"></span>
      </div>
      <div class="field-group">
        <label id="accountTypeLabel">Account Type</label>
        <div class="radio-group" role="radiogroup" aria-labelledby="accountTypeLabel">
          <label>
            <input 
              type="radio" 
              name="type" 
              value="free" 
              data-bind="form.account.type" 
              ${form.account.type === 'free' ? 'checked' : ''}
              aria-checked="${form.account.type === 'free'}"
            />
            Free
          </label>
          <label>
            <input 
              type="radio" 
              name="type" 
              value="premium" 
              data-bind="form.account.type" 
              ${form.account.type === 'premium' ? 'checked' : ''}
              aria-checked="${form.account.type === 'premium'}"
            />
            Premium
          </label>
        </div>
      </div>
    `;
  }
  // Step 3: Preferences
  else if (ui.currentStep === 3) {
    html += `
      <div class="field-group">
        <div class="checkbox-group">
          <label>
            <input 
              type="checkbox" 
              data-bind="form.preferences.newsletter" 
              ${form.preferences.newsletter ? 'checked' : ''}
              aria-checked="${form.preferences.newsletter}"
            />
            Subscribe to newsletter
          </label>
        </div>
      </div>
    `;
    
    if (form.account.type === 'premium') {
      html += `
        <div class="field-group">
          <label for="billing">Billing Cycle</label>
          <select 
            id="billing" 
            name="billing" 
            data-bind="form.preferences.billing"
            aria-label="Select billing cycle"
          >
            <option value="monthly" ${form.preferences.billing === 'monthly' ? 'selected' : ''}>Monthly ($9.99)</option>
            <option value="yearly" ${form.preferences.billing === 'yearly' ? 'selected' : ''}>Yearly ($99.99 - Save 17%)</option>
          </select>
        </div>
        <div class="field-group">
          <label id="paymentMethodLabel">Payment Method</label>
          <div class="radio-group" role="radiogroup" aria-labelledby="paymentMethodLabel">
            <label>
              <input 
                type="radio" 
                name="payment" 
                value="credit" 
                data-bind="form.preferences.payment" 
                ${form.preferences.payment === 'credit' ? 'checked' : ''}
                aria-checked="${form.preferences.payment === 'credit'}"
              />
              Credit Card
            </label>
            <label>
              <input 
                type="radio" 
                name="payment" 
                value="paypal" 
                data-bind="form.preferences.payment" 
                ${form.preferences.payment === 'paypal' ? 'checked' : ''}
                aria-checked="${form.preferences.payment === 'paypal'}"
              />
              PayPal
            </label>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="field-group">
          <label for="referral">
            Referral Code (optional)
            <span class="tooltip" tabindex="0" role="tooltip" aria-label="Enter a code to get bonus features">
              <span class="tooltip-icon" aria-hidden="true">?</span>
              <span class="tooltip-text">Enter a code to get bonus features</span>
            </span>
          </label>
          <input 
            id="referral" 
            name="referral" 
            data-bind="form.preferences.referral" 
            placeholder="e.g., FRIEND2024"
            aria-label="Enter referral code"
          />
        </div>
      `;
    }
  }
  // Step 4: Review & Submit
  else if (ui.currentStep === 4) {
    html += `
      <div class="review-list" role="region" aria-label="Review your information">
        <h3>Review Your Information</h3>
        <ul>
          <li><strong>Name:</strong> ${form.personal.firstName} ${form.personal.lastName}</li>
          <li><strong>Email:</strong> ${form.personal.email}</li>
          ${form.personal.phone ? `<li><strong>Phone:</strong> ${form.personal.phone}</li>` : ''}
          <li><strong>Username:</strong> ${form.account.username}</li>
          <li><strong>Account Type:</strong> ${form.account.type.charAt(0).toUpperCase() + form.account.type.slice(1)}</li>
          ${form.account.type === 'premium' ? `
            <li><strong>Billing:</strong> ${form.preferences.billing.charAt(0).toUpperCase() + form.preferences.billing.slice(1)}</li>
            <li><strong>Payment:</strong> ${form.preferences.payment === 'credit' ? 'Credit Card' : 'PayPal'}</li>
          ` : form.preferences.referral ? `
            <li><strong>Referral:</strong> ${form.preferences.referral}</li>
          ` : ''}
          <li><strong>Newsletter:</strong> ${form.preferences.newsletter ? 'Subscribed' : 'Not subscribed'}</li>
        </ul>
      </div>
      <div class="field-group">
        <div class="checkbox-group">
          <label>
            <input 
              type="checkbox" 
              id="terms" 
              data-bind="form.terms" 
              ${form.terms ? 'checked' : ''}
              aria-checked="${form.terms}"
              aria-required="true"
              aria-invalid="${!!errors.terms}"
              aria-describedby="termsError"
            />
            I agree to the terms & conditions *
          </label>
        </div>
        <span class="error" id="termsError" role="alert" aria-live="polite"></span>
      </div>
    `;
  }

  html += '</div>';
  stepContent.innerHTML = html;

  // Clean up previous subscriptions and re-bind
  if (cleanupBindDom) {
    cleanupBindDom();
  }
  cleanupBindDom = bindDom(document.body, { form });
  
  attachEventListeners();
  updateErrorDisplay();
  updateNextButton();
  
  // Focus first input
  const firstInput = stepContent.querySelector('input:not([type="radio"]):not([type="checkbox"])');
  if (firstInput) {
    firstInput.focus();
  } else {
    const firstInteractive = stepContent.querySelector('input, select, button');
    if (firstInteractive) firstInteractive.focus();
  }
}

function renderSuccessMessage() {
  stepContent.innerHTML = `
    <div class="success-message">
      <h2>🎉 Registration Successful!</h2>
      <p>Welcome, ${form.personal.firstName}! Your account has been created.</p>
    </div>
  `;
  prevBtn.style.display = 'none';
  nextBtn.style.display = 'none';
  submitBtn.style.display = 'none';
}

// --- Event Listeners ---
function attachEventListeners() {
  // Real-time validation
  const inputs = stepContent.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select');
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      const fieldName = input.name || input.id;
      ui.touched[fieldName] = true; // Mark as touched
      isStepValid(ui.currentStep);
      updateErrorDisplay();
      updateNextButton();
    });
    
    input.addEventListener('input', () => {
      // Mark as touched and re-validate on input
      const fieldName = input.name || input.id;
      ui.touched[fieldName] = true;
      isStepValid(ui.currentStep);
      updateErrorDisplay();
      updateNextButton();
    });
    
    // Enter key to go to next field or submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const formInputs = Array.from(stepContent.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select'));
        const currentIndex = formInputs.indexOf(input);
        if (currentIndex < formInputs.length - 1) {
          formInputs[currentIndex + 1].focus();
        } else if (ui.currentStep < 4 && !nextBtn.disabled) {
          nextBtn.click();
        } else if (ui.currentStep === 4 && !submitBtn.disabled) {
          submitBtn.click();
        }
      }
    });
  });
  
  // Username check
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      debouncedUsernameCheck(e.target.value);
    });
  }
  
  // Password strength
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      ui.passwordStrength = calculatePasswordStrength(e.target.value);
      updateErrorDisplay();
    });
  }
  
  // Password visibility toggles
  const togglePassword = document.getElementById('togglePassword');
  if (togglePassword) {
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ui.passwordVisible = !ui.passwordVisible;
      const pwdInput = document.getElementById('password');
      if (pwdInput) {
        pwdInput.type = ui.passwordVisible ? 'text' : 'password';
      }
      // update icon without re-render
      togglePassword.textContent = ui.passwordVisible ? '🐵' : '🙈';
    });
  }
  
  const toggleConfirm = document.getElementById('toggleConfirm');
  if (toggleConfirm) {
    toggleConfirm.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ui.confirmVisible = !ui.confirmVisible;
      const confInput = document.getElementById('confirm');
      if (confInput) {
        confInput.type = ui.confirmVisible ? 'text' : 'password';
      }
      // update icon without re-render
      toggleConfirm.textContent = ui.confirmVisible ? '🐵' : '🙈';
    });
  }
  
  // Phone auto-formatting
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      const cleaned = e.target.value.replace(/\D/g, '');
      if (cleaned.length <= 10) {
        let formatted = cleaned;
        if (cleaned.length > 6) {
          formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length > 3) {
          formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        } else if (cleaned.length > 0) {
          formatted = `(${cleaned}`;
        }
        form.personal.phone = formatted;
        e.target.value = formatted;
      }
    });
  }
  
  // Account type change triggers step 3 re-render
  const typeInputs = document.querySelectorAll('input[name="type"]');
  typeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      form.account.type = e.target.value;
    });
  });
  
  // Payment method radio buttons
  const paymentInputs = document.querySelectorAll('input[name="payment"]');
  paymentInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      form.preferences.payment = e.target.value;
    });
  });
  
  // Newsletter checkbox
  const newsletterInput = stepContent.querySelector('input[type="checkbox"][data-bind="form.preferences.newsletter"]');
  if (newsletterInput) {
    newsletterInput.addEventListener('change', (e) => {
      form.preferences.newsletter = e.target.checked;
    });
  }
  
  // Terms checkbox to update submit button
  const termsInput = document.getElementById('terms');
  if (termsInput) {
    termsInput.addEventListener('change', (e) => {
      form.terms = e.target.checked;
      updateNextButton();
    });
  }
  
  // Tooltips keyboard support
  const tooltips = stepContent.querySelectorAll('.tooltip');
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const tooltipText = tooltip.querySelector('.tooltip-text');
        if (tooltipText) {
          tooltipText.style.visibility = tooltipText.style.visibility === 'visible' ? 'hidden' : 'visible';
          tooltipText.style.opacity = tooltipText.style.opacity === '1' ? '0' : '1';
        }
      }
    });
  });
}

function updateNextButton() {
  // Validate without setting errors (just check)
  let valid = true;
  if (ui.currentStep === 1) {
    valid = form.personal.firstName.trim().length >= 2 &&
            form.personal.lastName.trim().length >= 2 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal.email);
  } else if (ui.currentStep === 2) {
    valid = form.account.username.trim().length >= 5 &&
            form.account.password.length >= 8 &&
            form.account.password === form.account.confirm &&
            !ui.usernameLoading &&
            !errors.username; // Username must be available
  } else if (ui.currentStep === 3) {
    valid = true; // Preferences are optional
  } else if (ui.currentStep === 4) {
    valid = form.terms;
  }
  
  if (ui.currentStep === 4) {
    submitBtn.disabled = !valid;
  } else {
    nextBtn.disabled = !valid;
  }
}

// --- Navigation ---
prevBtn.onclick = () => {
  if (ui.currentStep > 1) {
    ui.currentStep--;
    renderStep();
  }
};

nextBtn.onclick = () => {
  // Mark all fields in current step as touched
  if (ui.currentStep === 1) {
    ui.touched.firstName = true;
    ui.touched.lastName = true;
    ui.touched.email = true;
    ui.touched.phone = true;
  } else if (ui.currentStep === 2) {
    ui.touched.username = true;
    ui.touched.password = true;
    ui.touched.confirm = true;
  }
  
  if (isStepValid(ui.currentStep) && ui.currentStep < 4) {
    ui.currentStep++;
    renderStep();
  } else {
    updateErrorDisplay();
  }
};

// --- Form Submission ---
multiForm.onsubmit = (e) => {
  e.preventDefault();
  
  // Mark terms as touched
  ui.touched.terms = true;
  
  if (!validateStep4()) {
    updateErrorDisplay();
    return;
  }
  
  // Simulate submission
  ui.submitted = true;
  renderStep();
};

ui.touched = {};
renderStep();