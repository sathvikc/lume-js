import { state, bindDom, effect } from 'lume-js';

/**
 * Multi-Step Registration Form - Lume.js Best Practices Example
 * 
 * This example demonstrates lume-js's core reactive patterns in a real-world scenario:
 * 
 * 1. **Reactive State Management**: Uses state() to create reactive objects that automatically
 *    trigger updates when data changes. Shows nested state objects for organizing complex data.
 * 
 * 2. **Two-Way Data Binding**: Uses bindDom() to automatically sync form inputs with state
 *    using data-bind attributes, eliminating manual event listeners for inputs.
 * 
 * 3. **Automatic Dependency Tracking**: Uses effect() to create reactive side effects that
 *    automatically re-run when their dependencies change (validation, DOM updates, etc.).
 * 
 * 4. **Standards-Only Approach**: All reactivity uses standard data-* attributes and DOM APIs,
 *    no custom syntax or build steps required. HTML remains static and semantic.
 * 
 * 5. **Declarative Patterns**: Validation rules, display mappings, and field configs use
 *    objects and forEach loops to reduce boilerplate and improve maintainability.
 * 
 * Features: 4-step wizard, real-time validation, async username check, password strength,
 * phone formatting, conditional fields, review page, and success screen.
 */

// ============================================================================
// STATE MANAGEMENT - UNIFIED STORE
// ============================================================================

// Create a single unified store that contains everything
// Note: bindDom() will be called below and auto-waits for DOMContentLoaded
const store = state({
  // Form data
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
  
  // Validation errors
  errors: state({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirm: '',
    terms: '',
  }),
  
  // UI state
  ui: state({
    currentStep: 1,
    usernameCheck: state({
      isChecking: false,
      isAvailable: false,
      checkedValue: '',
    }),
    submitted: false,
    attemptedSubmit: false,
  })
});

// Create aliases for easier access
const form = {
  personal: store.personal,
  account: store.account,
  preferences: store.preferences,
  get terms() { return store.terms; },
  set terms(val) { store.terms = val; }
};
const ui = store.ui;
const errors = store.errors;

// ============================================================================
// BIND DOM - ONE TIME SETUP
// ============================================================================

// Bind all data-bind attributes to the unified store
const cleanup = bindDom(document.body, store);

// ============================================================================
// USERNAME AVAILABILITY CHECK (Async with Race Condition Handling)
// ============================================================================

let usernameRequestId = 0;

async function checkUsernameAvailability(username) {
  const trimmed = username.trim();
  
  ui.usernameCheck.isAvailable = false;
  ui.usernameCheck.checkedValue = '';
  
  if (trimmed.length < 5) {
    ui.usernameCheck.isChecking = false;
    return;
  }
  
  const requestId = ++usernameRequestId;
  ui.usernameCheck.isChecking = true;
  
  try {
    // Simulate API call
    const delay = Math.random() * 800 + 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (requestId !== usernameRequestId) return;
    
    const isAvailable = Math.random() > 0.5;
    ui.usernameCheck.isAvailable = isAvailable;
    ui.usernameCheck.checkedValue = trimmed;
  } catch (error) {
    console.error('Username check failed:', error);
  } finally {
    if (requestId === usernameRequestId) {
      ui.usernameCheck.isChecking = false;
    }
  }
}

// Trigger username check when username changes
effect(() => {
  const username = form.account.username;
  checkUsernameAvailability(username);
});

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================

function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

effect(() => {
  const formatted = formatPhone(form.personal.phone);
  if (formatted !== form.personal.phone) {
    form.personal.phone = formatted;
  }
});

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

// Validation rules - declarative and DRY
const validationRules = {
  firstName: () => {
    const val = form.personal.firstName.trim();
    return val.length >= 2 ? '' : (val ? 'Must be at least 2 characters' : '');
  },
  lastName: () => {
    const val = form.personal.lastName.trim();
    return val.length >= 2 ? '' : (val ? 'Must be at least 2 characters' : '');
  },
  email: () => {
    const val = form.personal.email.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    return val && !isValid ? 'Please enter a valid email' : '';
  },
  username: () => {
    const val = form.account.username.trim();
    if (!val) return '';
    if (val.length < 5) return 'Must be at least 5 characters';
    if (ui.usernameCheck.checkedValue === val && !ui.usernameCheck.isAvailable) {
      return `Username "${val}" is already taken`;
    }
    return '';
  },
  password: () => {
    const val = form.account.password;
    return val && val.length < 8 ? 'Password must be at least 8 characters' : '';
  },
  confirm: () => {
    const val = form.account.confirm;
    return val && val !== form.account.password ? 'Passwords do not match' : '';
  },
  terms: () => {
    if (ui.currentStep === 4 && !form.terms && ui.attemptedSubmit) {
      return 'You must agree to the terms';
    }
    return '';
  }
};

// Create validation effects from rules
Object.entries(validationRules).forEach(([field, rule]) => {
  effect(() => {
    errors[field] = rule();
  });
});

// ============================================================================
// PASSWORD STRENGTH INDICATOR
// ============================================================================

effect(() => {
  const password = form.account.password;
  const strengthEl = document.getElementById('passwordStrength');
  
  if (!strengthEl) return;
  
  if (!password) {
    strengthEl.innerHTML = '';
    return;
  }
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  let strength = 'weak';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else strength = 'strong';
  
  strengthEl.innerHTML = `
    <div>Password strength: <strong>${strength}</strong></div>
    <div class="strength-bar"><div class="strength-fill ${strength}"></div></div>
  `;
});

// ============================================================================
// USERNAME STATUS DISPLAY
// ============================================================================

effect(() => {
  const statusEl = document.getElementById('usernameStatus');
  if (!statusEl) return;
  
  const username = form.account.username.trim();
  const isChecking = ui.usernameCheck.isChecking;
  const isAvailable = ui.usernameCheck.isAvailable;
  const checkedValue = ui.usernameCheck.checkedValue;
  
  if (isChecking && username.length >= 5) {
    statusEl.textContent = `Checking availability for "${username}"...`;
    statusEl.className = 'username-status loading';
  } else if (isAvailable && checkedValue === username && username.length >= 5) {
    statusEl.textContent = `✓ Username "${checkedValue}" is available`;
    statusEl.className = 'username-status available';
  } else {
    statusEl.textContent = '';
    statusEl.className = 'username-status';
  }
});

// ============================================================================
// INPUT ERROR CLASSES
// ============================================================================

// Apply error classes to all input fields (consolidated)
const errorFields = ['firstName', 'lastName', 'email', 'username', 'password', 'confirm'];
errorFields.forEach(field => {
  effect(() => {
    const input = document.getElementById(field);
    if (!input) return;
    
    const hasError = !!errors[field];
    input.classList.toggle('error-field', hasError);
    
    // Special case: username success state
    if (field === 'username') {
      const isAvailable = ui.usernameCheck.isAvailable && 
                          ui.usernameCheck.checkedValue === form.account.username.trim();
      input.classList.toggle('input-success', isAvailable && !hasError);
    }
  });
});

// ============================================================================
// STEP NAVIGATION & VISIBILITY
// ============================================================================

// Consolidated step navigation (content, indicators, labels)
effect(() => {
  const currentStep = store.ui.currentStep;
  
  for (let i = 1; i <= 4; i++) {
    // Step content visibility
    const stepEl = document.getElementById(`step${i}`);
    if (stepEl) stepEl.classList.toggle('active', i === currentStep);
    
    // Stepper indicators (progress dots)
    const indicator = document.querySelector(`[data-step-indicator="${i}"]`);
    if (indicator) indicator.classList.toggle('active', i <= currentStep);
    
    // Step labels
    const label = document.querySelector(`[data-step-label="${i}"]`);
    if (label) label.classList.toggle('active', i === currentStep);
  }
});

// Show/hide premium/free fields based on account type
effect(() => {
  const type = form.account.type;
  const premiumFields = document.getElementById('premiumFields');
  const freeFields = document.getElementById('freeFields');
  
  if (premiumFields) premiumFields.style.display = type === 'premium' ? '' : 'none';
  if (freeFields) freeFields.style.display = type === 'free' ? '' : 'none';
});

// ============================================================================
// BUTTON STATE MANAGEMENT
// ============================================================================

// Consolidated button visibility and state
effect(() => {
  const currentStep = store.ui.currentStep;
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  // Previous button visibility
  if (prevBtn) prevBtn.style.display = currentStep === 1 ? 'none' : '';
  
  // Next/Submit button visibility
  if (nextBtn) nextBtn.classList.toggle('hidden', currentStep === 4);
  if (submitBtn) submitBtn.classList.toggle('hidden', currentStep !== 4);
  
  // Calculate step validity and update disabled state
  let isValid = false;
  
  if (currentStep === 1) {
    isValid = form.personal.firstName.trim().length >= 2 &&
              form.personal.lastName.trim().length >= 2 &&
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal.email.trim());
  } else if (currentStep === 2) {
    isValid = form.account.username.trim().length >= 5 &&
              form.account.password.length >= 8 &&
              form.account.password === form.account.confirm &&
              !ui.usernameCheck.isChecking &&
              ui.usernameCheck.isAvailable &&
              ui.usernameCheck.checkedValue === form.account.username.trim();
  } else if (currentStep === 3) {
    isValid = true;
  } else if (currentStep === 4) {
    isValid = form.terms;
  }
  
  if (nextBtn) nextBtn.disabled = !isValid;
  if (submitBtn) submitBtn.disabled = !isValid;
});

// ============================================================================
// REVIEW PAGE DISPLAY
// ============================================================================

// Review page text displays - consolidated
const reviewDisplays = {
  accountTypeDisplay: () => form.account.type.charAt(0).toUpperCase() + form.account.type.slice(1),
  billingDisplay: () => form.preferences.billing.charAt(0).toUpperCase() + form.preferences.billing.slice(1),
  paymentDisplay: () => form.preferences.payment === 'credit' ? 'Credit Card' : 'PayPal',
  newsletterDisplay: () => form.preferences.newsletter ? 'Subscribed' : 'Not subscribed',
};

// Create effects for text displays
Object.entries(reviewDisplays).forEach(([id, fn]) => {
  effect(() => {
    const el = document.getElementById(id);
    if (el) el.textContent = fn();
  });
});

// Review item visibility
effect(() => {
  const phoneReview = document.getElementById('phoneReview');
  if (phoneReview) phoneReview.style.display = form.personal.phone ? '' : 'none';
});

effect(() => {
  const type = form.account.type;
  const billingReview = document.getElementById('billingReview');
  const paymentReview = document.getElementById('paymentReview');
  const referralReview = document.getElementById('referralReview');
  
  if (billingReview) billingReview.style.display = type === 'premium' ? '' : 'none';
  if (paymentReview) paymentReview.style.display = type === 'premium' ? '' : 'none';
  if (referralReview) referralReview.style.display = type === 'free' && form.preferences.referral ? '' : 'none';
});

// ============================================================================
// SUCCESS MESSAGE
// ============================================================================

effect(() => {
  const successMessage = document.getElementById('successMessage');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');
  const actions = document.querySelector('.actions');
  
  if (store.ui.submitted) {
    if (successMessage) successMessage.classList.remove('hidden');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';
    if (step4) step4.style.display = 'none';
    if (actions) actions.style.display = 'none';
  } else {
    if (successMessage) successMessage.classList.add('hidden');
    // Clear inline styles so CSS active class can work
    if (step1) step1.style.display = '';
    if (step2) step2.style.display = '';
    if (step3) step3.style.display = '';
    if (step4) step4.style.display = '';
    if (actions) actions.style.display = '';
  }
});

// ============================================================================
// NAVIGATION HANDLERS (Manual event listeners for buttons only)
// ============================================================================

function goToNextStep() {
  if (store.ui.currentStep < 4) {
    store.ui.currentStep++;
  }
}

function goToPrevStep() {
  if (store.ui.currentStep > 1) {
    store.ui.currentStep--;
  }
}

async function submitForm(e) {
  e.preventDefault();
  
  // Mark that user attempted to submit
  store.ui.attemptedSubmit = true;
  
  if (!store.terms) {
    store.errors.terms = 'You must agree to the terms';
    return;
  }
  
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }
  
  // Simulate API submission
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('Form submitted:', {
    personal: { ...store.personal },
    account: { 
      username: store.account.username,
      type: store.account.type,
      password: '[REDACTED]'
    },
    preferences: { ...store.preferences },
    terms: store.terms
  });
  
  store.ui.submitted = true;
}

function resetForm() {
  // Reset form data
  store.personal.firstName = '';
  store.personal.lastName = '';
  store.personal.email = '';
  store.personal.phone = '';
  
  store.account.username = '';
  store.account.password = '';
  store.account.confirm = '';
  store.account.type = 'free';
  
  store.preferences.newsletter = false;
  store.preferences.billing = 'monthly';
  store.preferences.payment = 'credit';
  store.preferences.referral = '';
  
  store.terms = false;
  
  // Reset UI state
  store.ui.currentStep = 1;
  store.ui.usernameCheck.isChecking = false;
  store.ui.usernameCheck.isAvailable = false;
  store.ui.usernameCheck.checkedValue = '';
  store.ui.submitted = false;
  store.ui.attemptedSubmit = false;
  
  // Reset errors
  Object.keys(store.errors).forEach(key => {
    store.errors[key] = '';
  });
  
  // Reset submit button state
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
  
  usernameRequestId = 0;
}

// Attach button event listeners
document.getElementById('prevBtn').addEventListener('click', goToPrevStep);
document.getElementById('nextBtn').addEventListener('click', goToNextStep);
document.getElementById('multiForm').addEventListener('submit', submitForm);

// Reset button only exists when success message is shown
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', resetForm);
}

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener('beforeunload', () => {
  cleanup();
});

console.log('✅ Form initialized with bindDom - no innerHTML used!');