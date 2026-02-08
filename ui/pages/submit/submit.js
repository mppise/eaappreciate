/**
 * Submit Page JavaScript
 * Handles accomplishment submission and display of user's past submissions
 */

let userAccomplishments = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user has access to submit page
  if (!EAApp.canSubmit()) {
    // Show access denied message instead of loading the submit page
    const mainContent = document.querySelector('.page-layout');
    if (mainContent) {
      EAApp.showAccessDenied(mainContent, 'submit accomplishments');
    }
    return; // Exit early, don't load submit functionality
  }

  displayCurrentUser();
  await loadUserAccomplishments();
  setupFormHandler();
  setupWordCounters();
});

function displayCurrentUser() {
  const userElement = document.getElementById('current-user');
  const user = EAApp.currentUser;
  userElement.textContent = user.name;
}

function setupFormHandler() {
  const form = document.getElementById('accomplishment-form');
  const generateQuestionsBtn = document.getElementById('generate-questions-btn');
  const generateStatementBtn = document.getElementById('generate-statement-btn');
  const regenerateBtn = document.getElementById('regenerate-btn');

  // Handle contextual questions generation
  generateQuestionsBtn.addEventListener('click', generateContextualQuestions);

  // Handle statement generation (preview step)
  generateStatementBtn.addEventListener('click', generateStatementPreview);

  // Handle regeneration
  regenerateBtn.addEventListener('click', regenerateStatement);

  // Handle final form submission (approval)
  form.addEventListener('submit', handleFormSubmission);
}

async function generateContextualQuestions() {
  const generateBtn = document.getElementById('generate-questions-btn');
  const originalText = generateBtn.textContent;

  try {
    // Validate basic fields
    const originalStatement = document.getElementById('original-statement').value.trim();
    const impactType = document.getElementById('impact-type').value;

    if (!originalStatement) {
      showError('Please describe your accomplishment first.');
      return;
    }

    if (!impactType) {
      showError('Please select the impact type.');
      return;
    }

    // Check word limits for basic fields
    const wordLimitErrors = validateWordLimits();
    if (wordLimitErrors.length > 0) {
      showError('Please reduce text in the following fields:\n' + wordLimitErrors.join('\n'));
      return;
    }

    // Show loading state
    generateBtn.textContent = 'Generating Questions...';
    generateBtn.disabled = true;

    // Get email appreciation (optional)
    const emailAppreciation = document.getElementById('email-appreciation').value.trim();

    // Call API to generate contextual questions
    const response = await fetch('/api/questions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalStatement,
        impactType,
        emailAppreciation
      })
    });

    const result = await response.json();

    if (result.success) {
      displayContextualQuestions(result.data.questions);
      showDynamicFields();
    } else {
      throw new Error('Failed to generate questions');
    }

  } catch (error) {
    console.error('Error generating questions:', error);
    showError('Failed to generate contextual questions. Please try again.');
  } finally {
    // Reset button state
    generateBtn.textContent = originalText;
    generateBtn.disabled = false;
  }
}

function displayContextualQuestions(questions) {
  const container = document.getElementById('contextual-questions-container');

  container.innerHTML = questions.map((question, index) => `
        <div class="form-group">
            <label class="form-label" for="dynamic-question-${index}">
                ${question}
                <span class="form-hint">This helps create a more detailed achievement statement (max 60 words)</span>
            </label>
            <textarea id="dynamic-question-${index}" class="form-textarea" maxlength="360"
                placeholder="Share your answer here..."></textarea>
            <div class="word-counter">
                <span id="dynamic-question-${index}-counter" class="word-count">0/60 words</span>
            </div>
        </div>
    `).join('');

  // Setup word counters for the new dynamic questions
  setTimeout(() => {
    setupDynamicQuestionWordCounters();
  }, 100);
}

function showDynamicFields() {
  document.getElementById('basic-fields').style.display = 'none';
  document.getElementById('dynamic-fields').style.display = 'block';

  // Scroll to the dynamic fields
  document.getElementById('dynamic-fields').scrollIntoView({ behavior: 'smooth' });
}

function goBackToBasicFields() {
  document.getElementById('dynamic-fields').style.display = 'none';
  document.getElementById('preview-fields').style.display = 'none';
  document.getElementById('basic-fields').style.display = 'block';

  // Scroll to the basic fields
  document.getElementById('basic-fields').scrollIntoView({ behavior: 'smooth' });
}

function goBackToDynamicFields() {
  document.getElementById('preview-fields').style.display = 'none';
  document.getElementById('dynamic-fields').style.display = 'block';

  // Scroll to the dynamic fields
  document.getElementById('dynamic-fields').scrollIntoView({ behavior: 'smooth' });
}

async function generateStatementPreview() {
  const generateBtn = document.getElementById('generate-statement-btn');
  const originalText = generateBtn.textContent;

  try {
    // Check word limits for all fields before generating statement
    const wordLimitErrors = validateWordLimits();
    if (wordLimitErrors.length > 0) {
      showError('Please reduce text in the following fields:\n' + wordLimitErrors.join('\n'));
      return;
    }

    // Show loading state
    generateBtn.textContent = 'Generating Statement...';
    generateBtn.disabled = true;

    // Collect all form data
    const formData = {
      userId: EAApp.currentUser.email,
      userName: EAApp.currentUser.name,
      originalStatement: document.getElementById('original-statement').value,
      responses: {
        emailAppreciation: document.getElementById('email-appreciation').value,
        impactType: document.getElementById('impact-type').value,
        additionalDetails: collectDynamicQuestionResponses()
      },
      impactType: document.getElementById('impact-type').value,
      userThumbnail: EAApp.getUserThumbnail(EAApp.currentUser.name)
    };

    // Generate the statement for preview (without saving)
    const response = await fetch('/api/accomplishment/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.success) {
      displayStatementPreview(result.data.aiGeneratedStatement, formData);
      showPreviewFields();
    } else {
      throw new Error('Failed to generate statement');
    }

  } catch (error) {
    console.error('Error generating statement:', error);
    showError('Failed to generate statement. Please try again.');
  } finally {
    // Reset button state
    generateBtn.textContent = originalText;
    generateBtn.disabled = false;
  }
}

function displayStatementPreview(statement, formData) {
  const previewContainer = document.getElementById('statement-preview');

  // Store the form data and generated statement for later use
  window.currentPreviewData = { statement, formData };

  previewContainer.innerHTML = `
    <div class="statement-card">
      <div class="statement-header">
        <div class="user-info">
          <img src="${formData.userThumbnail}" alt="${formData.userName}" class="user-avatar">
          <div class="user-details">
            <h4>${formData.userName}</h4>
            <span class="impact-badge impact-${formData.impactType}">
              ${formData.impactType} impact
            </span>
          </div>
        </div>
      </div>
      <div class="statement-content">
        ${statement}
      </div>
    </div>
  `;
}

function showPreviewFields() {
  document.getElementById('basic-fields').style.display = 'none';
  document.getElementById('dynamic-fields').style.display = 'none';
  document.getElementById('preview-fields').style.display = 'block';

  // Scroll to the preview fields
  document.getElementById('preview-fields').scrollIntoView({ behavior: 'smooth' });
}

async function regenerateStatement() {
  const regenerateBtn = document.getElementById('regenerate-btn');
  const originalText = regenerateBtn.textContent;

  try {
    // Show loading state
    regenerateBtn.textContent = 'Regenerating...';
    regenerateBtn.disabled = true;

    // Use stored form data to regenerate
    const formData = window.currentPreviewData.formData;

    // Generate a new statement
    const response = await fetch('/api/accomplishment/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.success) {
      displayStatementPreview(result.data.aiGeneratedStatement, formData);
    } else {
      throw new Error('Failed to regenerate statement');
    }

  } catch (error) {
    console.error('Error regenerating statement:', error);
    showError('Failed to regenerate statement. Please try again.');
  } finally {
    // Reset button state
    regenerateBtn.textContent = originalText;
    regenerateBtn.disabled = false;
  }
}

async function handleFormSubmission(event) {
  event.preventDefault();

  const submitButton = document.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  try {
    // Show loading state
    submitButton.textContent = 'Saving...';
    submitButton.disabled = true;

    // Use the previewed statement and form data
    const { statement, formData } = window.currentPreviewData;

    // Update the formData with the approved statement
    const finalData = {
      ...formData,
      aiGeneratedStatement: statement
    };

    // Submit to backend
    const response = await EAApp.submitAccomplishment(finalData);

    if (response.success) {
      showSubmissionResult(response.data);
      clearForm();
      await loadUserAccomplishments(); // Refresh the list
    } else {
      throw new Error('Submission failed');
    }

  } catch (error) {
    console.error('Submission error:', error);
    showError('Failed to submit accomplishment. Please try again.');
  } finally {
    // Reset button state
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
}

function collectDynamicQuestionResponses() {
  const container = document.getElementById('contextual-questions-container');
  const questionGroups = container.querySelectorAll('.form-group');

  let responses = [];

  questionGroups.forEach((group, index) => {
    const label = group.querySelector('.form-label');
    const textarea = group.querySelector(`#dynamic-question-${index}`);

    if (label && textarea) {
      const questionText = label.childNodes[0].textContent.trim(); // Get text without the hint span
      const answer = textarea.value.trim();

      if (answer) {
        responses.push(`Q: ${questionText}\nA: ${answer}`);
      }
    }
  });

  return responses.join('\n\n');
}

function showSubmissionResult(accomplishment) {
  const resultElement = document.getElementById('submission-result');

  resultElement.innerHTML = `
    <div class="result-header">
      <h3>✅ Accomplishment Successfully Generated!</h3>
      <p>Here's your professional achievement statement:</p>
    </div>
    <div class="result-content">
      <div class="generated-statement">
        ${accomplishment.aiGeneratedStatement}
      </div>
      <div class="result-actions">
        <button class="btn" onclick="copyToClipboard('${accomplishment.aiGeneratedStatement.replace(/'/g, "\\'")}')" title="Copy to clipboard">
          📋 Copy Statement
        </button>
        <a href="/" class="btn btn-primary">View in Feed</a>
      </div>
    </div>
  `;

  resultElement.style.display = 'block';
  resultElement.scrollIntoView({ behavior: 'smooth' });

  // Auto-hide after 10 seconds
  setTimeout(() => {
    resultElement.style.display = 'none';
  }, 10000);
}

function showError(message) {
  const resultElement = document.getElementById('submission-result');

  resultElement.innerHTML = `
    <div class="error-message">
      ${message}
    </div>
  `;

  resultElement.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    resultElement.style.display = 'none';
  }, 5000);
}

function clearForm() {
  document.getElementById('accomplishment-form').reset();

  // Reset form state to show basic fields
  document.getElementById('basic-fields').style.display = 'block';
  document.getElementById('dynamic-fields').style.display = 'none';
  document.getElementById('preview-fields').style.display = 'none';

  // Clear dynamic questions container
  document.getElementById('contextual-questions-container').innerHTML = '';

  // Clear preview data
  window.currentPreviewData = null;

  // Hide any submission results
  document.getElementById('submission-result').style.display = 'none';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show brief confirmation
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✅ Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  });
}

async function loadUserAccomplishments() {
  const userAccomplishmentsElement = document.getElementById('user-accomplishments');

  try {
    EAApp.showLoading(userAccomplishmentsElement);
    const response = await EAApp.getUserAccomplishments(EAApp.currentUser.email);

    if (response.success) {
      userAccomplishments = response.data;
      displayUserAccomplishments();
    } else {
      throw new Error('Failed to load accomplishments');
    }
  } catch (error) {
    console.error('Error loading user accomplishments:', error);
    EAApp.showError(userAccomplishmentsElement, 'Failed to load your accomplishments.');
  }
}

function displayUserAccomplishments() {
  const userAccomplishmentsElement = document.getElementById('user-accomplishments');

  if (userAccomplishments.length === 0) {
    userAccomplishmentsElement.innerHTML = `
      <div class="empty-state">
        <h4>No accomplishments yet</h4>
        <p>Submit your first accomplishment using the form!</p>
      </div>
    `;
    return;
  }

  const accomplishmentsHTML = userAccomplishments.map(accomplishment =>
    createUserAccomplishmentCard(accomplishment)
  ).join('');

  userAccomplishmentsElement.innerHTML = accomplishmentsHTML;
}

function createUserAccomplishmentCard(accomplishment) {
  const formattedDate = EAApp.formatDate(accomplishment.createdAt);
  const fullDate = new Date(accomplishment.createdAt).toLocaleDateString();

  return `
    <div class="user-accomplishment-card">
      <div class="card-header simplified-header">
        <div class="timestamp">${formattedDate} (${fullDate})</div>
        <div class="card-actions-header">
          <button class="btn btn-sm" onclick="toggleOriginalStatement('${accomplishment.id}')" title="Show original statement">
            📝 Original
          </button>
        </div>
      </div>
      
      <div class="card-content">
        <div class="accomplishment-text">
          ${accomplishment.aiGeneratedStatement}
        </div>
        
        <div class="card-metadata">
          <span class="impact-badge impact-${accomplishment.impactType}">
            ${accomplishment.impactType} impact
          </span>
          <small class="text-secondary">
            ${accomplishment.aiGeneratedStatement.split(' ').length} words
          </small>
        </div>
        
        <div id="original-${accomplishment.id}" class="original-statement">
          <span class="original-statement-label">Original Statement:</span>
          ${accomplishment.originalStatement}
          
          ${accomplishment.responses?.additionalDetails ? `
            <div style="margin-top: var(--spacing-sm);">
              <span class="original-statement-label">Additional Details:</span>
              ${accomplishment.responses.additionalDetails}
            </div>
          ` : ''}
        </div>
        
        ${accomplishment.responses?.emailAppreciation ? `
          <div id="appreciation-${accomplishment.id}" class="appreciation-section">
            <div class="appreciation-label">Email Appreciation:</div>
            ${accomplishment.responses.emailAppreciation}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function toggleOriginalStatement(accomplishmentId) {
  const originalElement = document.getElementById(`original-${accomplishmentId}`);
  const appreciationElement = document.getElementById(`appreciation-${accomplishmentId}`);
  const button = event.target;

  if (originalElement.classList.contains('show')) {
    originalElement.classList.remove('show');
    if (appreciationElement) appreciationElement.classList.remove('show');
    button.textContent = '📝 Original';
  } else {
    originalElement.classList.add('show');
    if (appreciationElement) appreciationElement.classList.add('show');
    button.textContent = '📝 Hide';
  }
}

async function showAccomplishmentDetails(id) {
  try {
    const response = await EAApp.getAccomplishmentDetails(id);
    if (response.success) {
      const accomplishment = response.data;
      showDetailsModal(accomplishment);
    }
  } catch (error) {
    console.error('Error loading accomplishment details:', error);
  }
}

function showDetailsModal(accomplishment) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Accomplishment Details</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <h4>Original Statement</h4>
          <p>${accomplishment.originalStatement}</p>
        </div>
        
        ${accomplishment.responses.emailAppreciation ? `
        <div class="detail-section">
          <h4>Email Appreciation</h4>
          <p>${accomplishment.responses.emailAppreciation}</p>
        </div>
        ` : ''}
        
        <div class="detail-section">
          <h4>Impact Type</h4>
          <span class="impact-badge impact-${accomplishment.impactType}">
            ${accomplishment.impactType} impact
          </span>
        </div>
        
        ${accomplishment.responses.additionalDetails ? `
        <div class="detail-section">
          <h4>Additional Details</h4>
          <p>${accomplishment.responses.additionalDetails}</p>
        </div>
        ` : ''}
        
        <div class="detail-section">
          <h4>Generated Professional Statement</h4>
          <div class="generated-statement">
            ${accomplishment.aiGeneratedStatement}
          </div>
        </div>
        
        <div class="detail-section">
          <h4>Created</h4>
          <p>${new Date(accomplishment.createdAt).toLocaleDateString()} at ${new Date(accomplishment.createdAt).toLocaleTimeString()}</p>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="copyToClipboard('${accomplishment.aiGeneratedStatement.replace(/'/g, "\\'")}')" title="Copy statement">
          📋 Copy Statement
        </button>
        <button class="btn" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// Word Counter Functions
function setupWordCounters() {
  // Setup word counters for basic fields
  const originalStatementField = document.getElementById('original-statement');
  const emailAppreciationField = document.getElementById('email-appreciation');

  if (originalStatementField) {
    setupWordCounterForField(originalStatementField, 'original-statement-counter', 60);
  }

  if (emailAppreciationField) {
    setupWordCounterForField(emailAppreciationField, 'email-appreciation-counter', 60);
  }
}

function setupWordCounterForField(textareaElement, counterId, wordLimit) {
  const counterElement = document.getElementById(counterId);

  if (!counterElement) return;

  // Initial count
  updateWordCount(textareaElement, counterElement, wordLimit);

  // Add event listeners for real-time counting
  textareaElement.addEventListener('input', () => {
    updateWordCount(textareaElement, counterElement, wordLimit);
  });

  textareaElement.addEventListener('paste', () => {
    // Delay to allow paste to complete
    setTimeout(() => {
      updateWordCount(textareaElement, counterElement, wordLimit);
    }, 10);
  });
}

function updateWordCount(textareaElement, counterElement, wordLimit) {
  const text = textareaElement.value.trim();
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;

  // Update counter display
  counterElement.textContent = `${wordCount}/${wordLimit} words`;

  // Remove all styling classes first
  counterElement.classList.remove('warning', 'error');
  textareaElement.classList.remove('over-limit');

  // Apply appropriate styling based on word count
  if (wordCount > wordLimit) {
    counterElement.classList.add('error');
    textareaElement.classList.add('over-limit');
  } else if (wordCount >= wordLimit * 0.8) {
    counterElement.classList.add('warning');
  }
}

function setupDynamicQuestionWordCounters() {
  const container = document.getElementById('contextual-questions-container');
  const textareas = container.querySelectorAll('textarea');

  textareas.forEach((textarea, index) => {
    const questionId = `dynamic-question-${index}`;
    const counterId = `${questionId}-counter`;

    // Add word counter HTML if it doesn't exist
    let counterElement = document.getElementById(counterId);
    if (!counterElement) {
      const wordCounterDiv = document.createElement('div');
      wordCounterDiv.className = 'word-counter';
      wordCounterDiv.innerHTML = `<span id="${counterId}" class="word-count">0/60 words</span>`;
      textarea.parentNode.appendChild(wordCounterDiv);
      counterElement = document.getElementById(counterId);
    }

    setupWordCounterForField(textarea, counterId, 60);
  });
}

function validateWordLimits() {
  const fields = [
    { element: document.getElementById('original-statement'), limit: 60, name: 'Original Statement' },
    { element: document.getElementById('email-appreciation'), limit: 60, name: 'Email Appreciation' }
  ];

  const dynamicQuestions = document.querySelectorAll('#contextual-questions-container textarea');
  dynamicQuestions.forEach((textarea, index) => {
    fields.push({
      element: textarea,
      limit: 60,
      name: `Question ${index + 1}`
    });
  });

  const errors = [];

  fields.forEach(field => {
    if (field.element && field.element.value.trim()) {
      const wordCount = field.element.value.trim().split(/\s+/).length;
      if (wordCount > field.limit) {
        errors.push(`${field.name} exceeds ${field.limit} word limit (${wordCount} words)`);
      }
    }
  });

  return errors;
}
