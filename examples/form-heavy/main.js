import { state, effect } from 'lume-js';
import { computed } from 'lume-js/addons';

/**
 * Multi-Step Registration Form - Best Practice Example
 * 
 * Demonstrates:
 * ✅ Computed state for validation (memoized, auto-updating)
 * ✅ Declarative validation schema (reduces boilerplate)
 * ✅ Focused effects for UI updates (granular reactivity)
 * ✅ Manual event listeners for inputs (no re-render on typing)
 * ✅ Immediate async validation with race condition handling
 * ✅ Real-time feedback without performance overhead
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

// Form data - grouped by sections (mirrors form structure)
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

// UI state - controls display and interactions
const ui = state({
  currentStep: 1,
  usernameCheck: state({
    isChecking: false,
    isAvailable: false,
    checkedValue: '',
  }),
  submitted: false,
  attemptedSubmit: false,
});


// ============================================================================
// USERNAME AVAILABILITY CHECK
// ============================================================================

let usernameRequestId = 0; // Track latest request

async function checkUsernameAvailability(username) {
  const trimmed = username.trim();
  
  // Clear previous results when user types
  ui.usernameCheck.isAvailable = false;
  ui.usernameCheck.checkedValue = '';
  
  // Fire API check immediately (no debounce)
  const requestId = ++usernameRequestId;
  ui.usernameCheck.isChecking = true;
  
  try {
    // Simulate API call with random delay (200-1000ms)
    const delay = Math.random() * 800 + 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Only process if this is still the latest request
    if (requestId !== usernameRequestId) return;
    
    // Simulate random availability (50/50 chance)
    const isAvailable = Math.random() > 0.5;
    
    ui.usernameCheck.isAvailable = isAvailable;
    ui.usernameCheck.checkedValue = trimmed;
    
  } catch (error) {
    console.error('Username check failed:', error);
  } finally {
    // Only clear loading if this is still the latest request
    if (requestId === usernameRequestId) {
      ui.usernameCheck.isChecking = false;
    }
  }
}


// ============================================================================
// VALIDATION SCHEMA & HELPER
// ============================================================================

// Declarative validation rules - easier to read and maintain
const validationRules = {
  firstName: {
    validate: (val) => val.trim().length >= 2,
    message: 'First name must be at least 2 characters',
  },
  lastName: {
    validate: (val) => val.trim().length >= 2,
    message: 'Last name must be at least 2 characters',
  },
  email: {
    validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
    message: 'Please enter a valid email',
  },
  username: {
    // Async validate that handles both sync and async checks
    validate: async (val) => {
      const trimmed = val.trim();
      
      // Sync validation first
      if (trimmed.length < 5) {
        return 'Must be at least 5 characters';
      }
      
      // Async validation - check if username matches the checked value
      if (ui.usernameCheck.checkedValue === trimmed) {
        if (!ui.usernameCheck.isAvailable) {
          return `Username "${trimmed}" is already taken`;
        }
      }
      
      return null; // Valid
    },
    // Sync-only version for immediate feedback
    validateSync: (val) => val.trim().length >= 5,
    message: 'Must be at least 5 characters',
  },
  password: {
    validate: (val) => val.length >= 8,
    message: 'Password must be at least 8 characters',
  },
  confirm: {
    validate: (val) => val === form.account.password,
    message: 'Passwords do not match',
  },
};

// Validation state - simple reactive state instead of computed
const validation = state({
  errors: {},
  passwordStrength: null,
  isCurrentStepValid: false,
});

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================

function formatPhoneNumber(value) {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}


// ============================================================================
// RENDERING FUNCTIONS (Only called on step changes, not during typing)
// ============================================================================

function renderStepper() {
  const stepper = document.getElementById('stepper');
  const stepLabels = document.getElementById('stepLabels');
  
  stepper.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const div = document.createElement('div');
    div.className = 'step' + (ui.currentStep >= i ? ' active' : '');
    stepper.appendChild(div);
  }
  
  const labels = stepLabels.querySelectorAll('span');
  labels.forEach((label, i) => {
    label.className = ui.currentStep === i + 1 ? 'active' : '';
  });
}

function renderStep1() {
  return `
    <div class="field-group">
      <label for="firstName">First Name *</label>
      <input 
        id="firstName" 
        name="firstName"
        type="text"
        value="${form.personal.firstName}"
        required 
        aria-required="true"
        aria-describedby="firstNameError"
      />
      <span class="error" id="firstNameError" role="alert" aria-live="polite"></span>
    </div>
    <div class="field-group">
      <label for="lastName">Last Name *</label>
      <input 
        id="lastName" 
        name="lastName"
        type="text"
        value="${form.personal.lastName}"
        required 
        aria-required="true"
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
        value="${form.personal.email}"
        required 
        aria-required="true"
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
        value="${form.personal.phone}"
        placeholder="(555) 123-4567"
        aria-describedby="phoneError"
      />
      <span class="error" id="phoneError" role="alert" aria-live="polite"></span>
    </div>
  `;
}

function renderStep2() {
  return `
    <div class="field-group">
      <label for="username">
        Username *
        <span class="tooltip" tabindex="0" role="tooltip" aria-label="5+ characters, letters and numbers">
          <span class="tooltip-icon" aria-hidden="true">?</span>
          <span class="tooltip-text">5+ characters, letters and numbers</span>
        </span>
      </label>
      <input 
        id="username" 
        name="username"
        type="text"
        value="${form.account.username}"
        required 
        aria-required="true"
        aria-describedby="usernameStatus usernameError"
      />
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
          type="password"
          value="${form.account.password}"
          required 
          aria-required="true"
          aria-describedby="passwordStrength passwordError"
        />
        <button type="button" class="toggle-password" id="togglePassword" aria-label="Toggle password visibility">
          🙈
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
          type="password"
          value="${form.account.confirm}"
          required 
          aria-required="true"
          aria-describedby="confirmError"
        />
        <button type="button" class="toggle-password" id="toggleConfirm" aria-label="Toggle password visibility">
          🙈
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
            ${form.account.type === 'free' ? 'checked' : ''}
          />
          Free
        </label>
        <label>
          <input 
            type="radio" 
            name="type" 
            value="premium" 
            ${form.account.type === 'premium' ? 'checked' : ''}
          />
          Premium
        </label>
      </div>
    </div>
  `;
}

function renderStep3() {
  let html = `
    <div class="field-group">
      <div class="checkbox-group">
        <label>
          <input 
            type="checkbox" 
            id="newsletter"
            ${form.preferences.newsletter ? 'checked' : ''}
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
        <select id="billing" name="billing" aria-label="Select billing cycle">
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
              ${form.preferences.payment === 'credit' ? 'checked' : ''}
            />
            Credit Card
          </label>
          <label>
            <input 
              type="radio" 
              name="payment" 
              value="paypal" 
              ${form.preferences.payment === 'paypal' ? 'checked' : ''}
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
          type="text"
          value="${form.preferences.referral}"
          placeholder="e.g., FRIEND2024"
        />
      </div>
    `;
  }
  
  return html;
}

function renderStep4() {
  return `
    <div class="review-list">
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
            ${form.terms ? 'checked' : ''}
          />
          I agree to the terms & conditions *
        </label>
      </div>
      <span class="error" id="termsError" role="alert" aria-live="polite"></span>
    </div>
  `;
}

function renderSuccessMessage() {
  const stepContent = document.getElementById('stepContent');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  stepContent.innerHTML = `
    <div class="success-message">
      <h2>🎉 Registration Successful!</h2>
      <p>Welcome, ${form.personal.firstName}! Your account has been created.</p>
      <button type="button" id="resetBtn" style="margin-top: 2em; width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 0.9em 1.5em; border: none; border-radius: 6px; font-size: 1em; font-weight: 600; cursor: pointer;">
        Start Over
      </button>
    </div>
  `;
  
  prevBtn.style.display = 'none';
  nextBtn.style.display = 'none';
  submitBtn.style.display = 'none';
  
  // Attach reset button listener
  document.getElementById('resetBtn').addEventListener('click', resetForm);
}

function renderStep() {
  if (ui.submitted) {
    renderSuccessMessage();
    return;
  }
  
  const stepContent = document.getElementById('stepContent');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  renderStepper();
  
  // Update navigation buttons
  prevBtn.style.display = ui.currentStep === 1 ? 'none' : '';
  nextBtn.classList.toggle('hidden', ui.currentStep === 4);
  submitBtn.classList.toggle('hidden', ui.currentStep !== 4);
  
  // Render step content
  let html = '<div class="step-container">';
  if (ui.currentStep === 1) html += renderStep1();
  else if (ui.currentStep === 2) html += renderStep2();
  else if (ui.currentStep === 3) html += renderStep3();
  else if (ui.currentStep === 4) html += renderStep4();
  html += '</div>';
  
  stepContent.innerHTML = html;
  
  // Attach event listeners for this step
  attachEventListeners();
}

// Separate function for initial focus (only called on step change)
function focusFirstField() {
  const stepContent = document.getElementById('stepContent');
  const firstInput = stepContent.querySelector('input:not([type="radio"]):not([type="checkbox"])');
  if (firstInput) {
    firstInput.focus();
  }
}


// ============================================================================
// EVENT LISTENERS (Manual, not bindDom)
// ============================================================================

function attachEventListeners() {
  const stepContent = document.getElementById('stepContent');
  
  // ===== STEP 1: Personal Info =====
  const firstNameInput = document.getElementById('firstName');
  if (firstNameInput) {
    firstNameInput.addEventListener('input', (e) => {
      form.personal.firstName = e.target.value;
    });
  }
  
  const lastNameInput = document.getElementById('lastName');
  if (lastNameInput) {
    lastNameInput.addEventListener('input', (e) => {
      form.personal.lastName = e.target.value;
    });
  }
  
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('input', (e) => {
      form.personal.email = e.target.value;
    });
  }
  
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      const formatted = formatPhoneNumber(e.target.value);
      form.personal.phone = formatted;
      // Update input value if formatting changed it
      if (e.target.value !== formatted) {
        e.target.value = formatted;
      }
    });
  }
  
  // ===== STEP 2: Account Info =====
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      form.account.username = e.target.value;
      // Trigger availability check only if valid length
      if (e.target.value.trim().length >= 5) {
        checkUsernameAvailability(e.target.value);
      } else {
        // Clear check state if too short
        ui.usernameCheck.isChecking = false;
        ui.usernameCheck.isAvailable = false;
        ui.usernameCheck.checkedValue = '';
      }
    });
  }
  
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      form.account.password = e.target.value;
    });
  }
  
  const confirmInput = document.getElementById('confirm');
  if (confirmInput) {
    confirmInput.addEventListener('input', (e) => {
      form.account.confirm = e.target.value;
    });
  }
  
  // Password visibility toggles
  const togglePassword = document.getElementById('togglePassword');
  if (togglePassword) {
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      const pwdInput = document.getElementById('password');
      if (pwdInput) {
        const isVisible = pwdInput.type === 'text';
        pwdInput.type = isVisible ? 'password' : 'text';
        togglePassword.textContent = isVisible ? '🙈' : '🐵';
      }
    });
  }
  
  const toggleConfirm = document.getElementById('toggleConfirm');
  if (toggleConfirm) {
    toggleConfirm.addEventListener('click', (e) => {
      e.preventDefault();
      const confInput = document.getElementById('confirm');
      if (confInput) {
        const isVisible = confInput.type === 'text';
        confInput.type = isVisible ? 'password' : 'text';
        toggleConfirm.textContent = isVisible ? '🙈' : '🐵';
      }
    });
  }
  
  // Account type radio buttons
  const typeInputs = document.querySelectorAll('input[name="type"]');
  typeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const previousType = form.account.type;
      form.account.type = e.target.value;
      
      // Only re-render if we're on step 3 (preferences) to show/hide conditional fields
      // If we're on step 2, don't re-render
      if (ui.currentStep === 3 && previousType !== e.target.value) {
        renderStep();
      }
    });
  });
  
  // ===== STEP 3: Preferences =====
  const newsletterInput = document.getElementById('newsletter');
  if (newsletterInput) {
    newsletterInput.addEventListener('change', (e) => {
      form.preferences.newsletter = e.target.checked;
    });
  }
  
  const billingSelect = document.getElementById('billing');
  if (billingSelect) {
    billingSelect.addEventListener('change', (e) => {
      form.preferences.billing = e.target.value;
    });
  }
  
  const paymentInputs = document.querySelectorAll('input[name="payment"]');
  paymentInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      form.preferences.payment = e.target.value;
    });
  });
  
  const referralInput = document.getElementById('referral');
  if (referralInput) {
    referralInput.addEventListener('input', (e) => {
      form.preferences.referral = e.target.value;
    });
  }
  
  // ===== STEP 4: Terms =====
  const termsInput = document.getElementById('terms');
  if (termsInput) {
    termsInput.addEventListener('change', (e) => {
      form.terms = e.target.checked;
    });
  }
}

// ============================================================================
// REACTIVE EFFECTS SETUP
// ============================================================================

function setupEffects() {
  // EFFECT 1: Calculate validation errors and update DOM
  // Runs whenever form fields change
  effect(() => {
    const errs = {};
    
    // Read all form fields to track as dependencies
    const firstName = form.personal.firstName;
    const lastName = form.personal.lastName;
    const email = form.personal.email;
    const username = form.account.username;
    const password = form.account.password;
    const confirm = form.account.confirm;
    const currentStep = ui.currentStep;
    
    // Validate personal info
    if (firstName && !validationRules.firstName.validate(firstName)) {
      errs.firstName = validationRules.firstName.message;
    }
    if (lastName && !validationRules.lastName.validate(lastName)) {
      errs.lastName = validationRules.lastName.message;
    }
    if (email && !validationRules.email.validate(email)) {
      errs.email = validationRules.email.message;
    }
    
    // Validate account info only on step 2
    if (currentStep === 2) {
      // Username: use sync validation, then check async result
      if (username && !validationRules.username.validateSync(username)) {
        errs.username = validationRules.username.message;
      } else if (username.length >= 5 && 
                 !ui.usernameCheck.isChecking && 
                 ui.usernameCheck.checkedValue === username.trim() && 
                 !ui.usernameCheck.isAvailable) {
        errs.username = `Username "${username.trim()}" is already taken`;
      }
      
      if (password && !validationRules.password.validate(password)) {
        errs.password = validationRules.password.message;
      }
      if (confirm && !validationRules.confirm.validate(confirm)) {
        errs.confirm = validationRules.confirm.message;
      }
    }
    
    // Update validation state
    validation.errors = errs;
    
    // Update DOM error messages
    const allErrorFields = ['firstName', 'lastName', 'email', 'phone', 'username', 'password', 'confirm'];
    allErrorFields.forEach(key => {
      const errorEl = document.getElementById(key + 'Error');
      if (errorEl) {
        errorEl.textContent = errs[key] || '';
      }
      
      const input = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
      if (input && input.classList) {
        input.classList.toggle('error-field', !!errs[key]);
      }
    });
    
    // Handle terms error
    const termsError = document.getElementById('termsError');
    if (termsError) {
      if (ui.attemptedSubmit && !form.terms) {
        termsError.textContent = 'You must agree to the terms';
      } else {
        termsError.textContent = '';
      }
    }
    
    // Update username status display
    const statusEl = document.getElementById('usernameStatus');
    const usernameInput = document.getElementById('username');
    const usernameErrorEl = document.getElementById('usernameError');
    
    if (statusEl) {
      const currentUsername = username.trim();
      const isChecking = ui.usernameCheck.isChecking;
      const isAvailable = ui.usernameCheck.isAvailable;
      const checkedValue = ui.usernameCheck.checkedValue;
      
      if (isChecking && currentUsername.length >= 5) {
        statusEl.textContent = `Checking availability for "${currentUsername}"...`;
        statusEl.className = 'username-status loading';
        if (usernameInput) usernameInput.classList.remove('input-success');
      } else if (isAvailable && checkedValue === currentUsername && currentUsername.length >= 5) {
        statusEl.textContent = `✓ Username "${checkedValue}" is available`;
        statusEl.className = 'username-status available';
        if (usernameInput) usernameInput.classList.add('input-success');
        if (usernameErrorEl) usernameErrorEl.textContent = '';
      } else if (!isAvailable && checkedValue === currentUsername && currentUsername.length >= 5) {
        statusEl.textContent = '';
        statusEl.className = 'username-status';
        if (usernameInput) usernameInput.classList.remove('input-success');
      } else {
        statusEl.textContent = '';
        statusEl.className = 'username-status';
        if (usernameInput) usernameInput.classList.remove('input-success');
      }
    }
  });

  // EFFECT 2: Calculate password strength and update DOM
  effect(() => {
    const password = form.account.password;
    let strength = null;
    
    if (password) {
      let score = 0;
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[^a-zA-Z0-9]/.test(password)) score++;
      
      if (score <= 2) strength = 'weak';
      else if (score <= 4) strength = 'medium';
      else strength = 'strong';
    }
    
    validation.passwordStrength = strength;
    
    const strengthEl = document.getElementById('passwordStrength');
    if (!strengthEl) return;
    
    if (strength) {
      strengthEl.innerHTML = `
        <div>Password strength: <strong>${strength}</strong></div>
        <div class="strength-bar"><div class="strength-fill ${strength}"></div></div>
      `;
    } else {
      strengthEl.innerHTML = '';
    }
  });

  // EFFECT 3: Calculate step validity and update button states
  effect(() => {
    const step = ui.currentStep;
    let valid = false;
    
    if (step === 1) {
      const firstName = form.personal.firstName.trim();
      const lastName = form.personal.lastName.trim();
      const email = form.personal.email.trim();
      
      valid = firstName.length >= 2 && 
              lastName.length >= 2 && 
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    } else if (step === 2) {
      const username = form.account.username.trim();
      const password = form.account.password;
      const confirm = form.account.confirm;
      
      valid = username.length >= 5 &&
              password.length >= 8 &&
              password === confirm &&
              !ui.usernameCheck.isChecking &&
              ui.usernameCheck.isAvailable &&
              ui.usernameCheck.checkedValue === username;
    } else if (step === 3) {
      valid = true;
    } else if (step === 4) {
      valid = form.terms;
    }
    
    validation.isCurrentStepValid = valid;
    
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    if (step === 4 && submitBtn) {
      submitBtn.disabled = !valid;
    } else if (nextBtn) {
      nextBtn.disabled = !valid;
    }
  });
}

// ============================================================================
// NAVIGATION HANDLERS
// ============================================================================

function goToNextStep() {
  if (!validation.isCurrentStepValid) {
    // Highlight first invalid field
    const currentErrors = validation.errors;
    const firstError = Object.keys(currentErrors).find(key => currentErrors[key]);
    if (firstError) {
      const input = document.getElementById(firstError);
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    return;
  }
  
  if (ui.currentStep < 4) {
    ui.currentStep++;
    ui.attemptedSubmit = false;
    renderStep();
    focusFirstField();
  }
}

function goToPrevStep() {
  if (ui.currentStep > 1) {
    ui.currentStep--;
    ui.attemptedSubmit = false;
    renderStep();
    focusFirstField();
  }
}

async function submitForm(e) {
  e.preventDefault();
  
  if (!validation.isCurrentStepValid) {
    ui.attemptedSubmit = true;
    const termsInput = document.getElementById('terms');
    if (termsInput) termsInput.focus();
    return;
  }
  
  ui.attemptedSubmit = false;
  
  // Simulate API submission with random delay
  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  const delay = Math.random() * 1500 + 500; // 500-2000ms
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Log form data (password redacted)
  console.log('Form submitted:', {
    personal: { ...form.personal },
    account: { 
      username: form.account.username,
      type: form.account.type,
      password: '[REDACTED]'
    },
    preferences: { ...form.preferences },
    terms: form.terms
  });
  
  ui.submitted = true;
  renderStep();
}

function resetForm() {
  // Reset all form data
  form.personal.firstName = '';
  form.personal.lastName = '';
  form.personal.email = '';
  form.personal.phone = '';
  
  form.account.username = '';
  form.account.password = '';
  form.account.confirm = '';
  form.account.type = 'free';
  
  form.preferences.newsletter = false;
  form.preferences.billing = 'monthly';
  form.preferences.payment = 'credit';
  form.preferences.referral = '';
  
  form.terms = false;
  
  // Reset UI state
  ui.currentStep = 1;
  ui.usernameCheck.isChecking = false;
  ui.usernameCheck.isAvailable = false;
  ui.usernameCheck.checkedValue = '';
  ui.submitted = false;
  ui.attemptedSubmit = false;
  
  // Reset username request tracking
  usernameRequestId = 0;
  
  // Reset button visibility (clear any inline styles from success message)
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  prevBtn.style.display = 'none'; // Step 1 - no previous
  nextBtn.style.display = '';
  nextBtn.classList.remove('hidden');
  submitBtn.style.display = 'none';
  submitBtn.classList.add('hidden');

  // Re-render
  renderStep();
 
  focusFirstField();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Attach navigation listeners
document.getElementById('prevBtn').addEventListener('click', goToPrevStep);
document.getElementById('nextBtn').addEventListener('click', goToNextStep);
document.getElementById('multiForm').addEventListener('submit', submitForm);

// Initial render
renderStep();
focusFirstField();

// Setup effects AFTER DOM is rendered
setupEffects();