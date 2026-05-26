class TraineeDashboard {
  constructor() {
    this.traineeId = null;
    this.shownNotifications = new Set();
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.setupEventListeners();
    this.loadDashboard();
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      if (!response.ok) {
        window.location.href = '/';
        return;
      }

      const data = await response.json();
      if (data.userType !== 'trainee') {
        window.location.href = '/';
        return;
      }

      this.traineeId = data.userId;
      document.getElementById('user-name').textContent = data.fullName;
      document.getElementById('user-id').textContent = `ID: ${data.systemId}`;

    } catch (error) {
      console.error('Auth error:', error);
      window.location.href = '/';
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
      modal.show();
    });

    document.getElementById('confirm-logout').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/';
    });

    // Change password
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('change-password-form').reset();
        document.getElementById('change-password-alert').innerHTML = '';
        const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        modal.show();
      });
    }

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitChangePassword();
      });
    }

    // Submit request
    document.getElementById('submit-request-btn').addEventListener('click', () => {
      this.submitRequest();
    });

    // CHPay submit
    const chpaySubmit = document.getElementById('chpay-submit');
    if (chpaySubmit) {
      chpaySubmit.addEventListener('click', (e) => {
        e.preventDefault();
        this.submitCHPay();
      });
    }

    const chpayCancel = document.getElementById('chpay-cancel');
    if (chpayCancel) {
      chpayCancel.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('chpay-form').reset();
        document.getElementById('file-name').textContent = '';
      });
    }

    // File upload drag-and-drop
    const fileUploadArea = document.getElementById('file-upload-area');
    const chpayFile = document.getElementById('chpay-file');
    if (fileUploadArea && chpayFile) {
      fileUploadArea.addEventListener('click', () => chpayFile.click());
      // keyboard activation (Enter / Space)
      fileUploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chpayFile.click();
        }
      });
      chpayFile.addEventListener('change', () => {
        if (chpayFile.files && chpayFile.files[0]) {
          document.getElementById('file-name').textContent = `✓ Selected: ${chpayFile.files[0].name}`;
        }
      });
      
      fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
      });
      fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
      });
      fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          chpayFile.files = e.dataTransfer.files;
          document.getElementById('file-name').textContent = `✓ Selected: ${e.dataTransfer.files[0].name}`;
        }
      });
    }

    const soaDownloadBtn = document.getElementById('soa-download-btn');
    if (soaDownloadBtn) {
      soaDownloadBtn.addEventListener('click', () => {
        const soaId = soaDownloadBtn.dataset.soaId;
        if (soaId) {
          this.downloadSOA(soaId);
        }
      });
    }

    // Notification setup
    const notificationBell = document.getElementById('notification-bell');
    const notificationDropdown = document.getElementById('notification-dropdown');
    
    if (notificationBell) {
      notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('show');
        if (notificationDropdown.classList.contains('show')) {
          this.loadNotifications();
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (notificationDropdown && notificationDropdown.classList.contains('show')) {
        notificationDropdown.classList.remove('show');
      }
    });

    // Clear notifications button
    const clearNotificationsBtn = document.getElementById('clear-notifications-btn');
    if (clearNotificationsBtn) {
      clearNotificationsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearAllNotifications();
      });
    }

    // Load notifications immediately and then periodically
    this.loadNotifications();
    setInterval(() => this.loadNotifications(), 10000); // Every 10 seconds
  }

  switchTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => {
      t.style.display = 'none';
    });

    // Remove active class
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Show selected tab
    const tabElement = document.getElementById(tab);
    if (tabElement) {
      tabElement.style.display = 'block';
    }

    // Set active link
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Load tab data
    if (tab === 'password-requests-tab') {
      this.loadPasswordRequests();
    } else if (tab === 'requests-tab') {
      this.loadRequests();
    } else if (tab === 'chpay-tab') {
      this.loadCHPay();
    }
  }

  async loadDashboard() {
    try {
      const response = await fetch('/api/trainee/dashboard', { credentials: 'include' });
      const data = await response.json();

      // Update stats
      document.getElementById('soa-count').textContent = data.stats.total_soas;
      document.getElementById('total-billings').textContent = parseFloat(data.stats.total_billings).toFixed(2);
      document.getElementById('total-paid').textContent = parseFloat(data.stats.total_paid).toFixed(2);
      document.getElementById('total-remaining').textContent = parseFloat(data.stats.total_balance).toFixed(2);
      document.getElementById('total-balance').textContent = `₱${parseFloat(data.stats.total_balance).toFixed(2)}`;
      document.getElementById('request-count').textContent = data.pending_requests.length;

      // Load SOAs
      this.loadSOAs();

      // Load and display announcements
      this.loadAnnouncements();

    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }

  async loadSOAs() {
    try {
      const response = await fetch('/api/trainee/soa', { credentials: 'include' });
      const soas = await response.json();

      let html = '';

      if (soas.length === 0) {
        html = '<div class="no-data"><i class="bi bi-inbox" style="font-size: 48px; margin-bottom: 20px;"></i><p>No Statements of Account yet</p></div>';
      } else {
        soas.forEach(soa => {
          const issueDate = new Date(soa.issue_date).toLocaleDateString();
          const statusBadge = this.getStatusBadge(soa.status);

          html += `<div class="soa-card ${soa.status === 'paid' ? 'paid' : ''}">
            <div class="soa-info">
              <h5>${soa.soa_number}</h5>
              <div class="soa-details">
                <strong>Issued:</strong> ${issueDate}
              </div>
              <div class="soa-details">
                <strong>Total:</strong> ₱${parseFloat(soa.total_amount).toFixed(2)} | 
                <strong>Paid:</strong> ₱${parseFloat(soa.amount_paid).toFixed(2)} | 
                <strong>Balance:</strong> ₱${parseFloat(soa.amount_remaining).toFixed(2)}
              </div>
              <div class="soa-details">
                Status: ${statusBadge}
              </div>
            </div>
            <div class="soa-actions">
              <button class="btn-small btn-view" onclick="trainee.viewSOA(${soa.id})">View Details</button>
              <button class="btn-small btn-download" onclick="trainee.downloadSOA(${soa.id})">
                <i class="bi bi-download"></i> PDF
              </button>
            </div>
          </div>`;
        });
      }

      document.getElementById('soa-list').innerHTML = html;

    } catch (error) {
      console.error('Error loading SOAs:', error);
      document.getElementById('soa-list').innerHTML = '<div class="no-data">Error loading SOAs</div>';
    }
  }

  getStatusBadge(status) {
    const badges = {
      'draft': '<span class="state-badge badge-draft">Draft</span>',
      'issued': '<span class="state-badge badge-issued">Issued</span>',
      'paid': '<span class="state-badge badge-paid">Paid</span>',
      'partial': '<span class="state-badge badge-partial">Partial</span>',
      'overdue': '<span class="state-badge badge-danger">Overdue</span>'
    };
    return badges[status] || `<span class="state-badge">${status}</span>`;
  }

  async viewSOA(soaId) {
    try {
      const [soaResponse, payments] = await Promise.all([
        fetch(`/api/trainee/soa/${soaId}`, { credentials: 'include' }),
        this.getSOAPayments(soaId)
      ]);

      if (!soaResponse.ok) {
        throw new Error('Failed to load SOA details');
      }

      const data = await soaResponse.json();
      data.transactions = payments;
      this.showSOAModal(data);
    } catch (error) {
      console.error('Error viewing SOA:', error);
      alert('Error loading SOA details');
    }
  }

  async getSOAPayments(soaId) {
    try {
      const response = await fetch(`/api/trainee/soa/${soaId}/payments`, { credentials: 'include' });
      if (!response.ok) {
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SOA payments:', error);
      return [];
    }
  }

  showSOAModal(data) {
    const body = document.getElementById('soa-modal-body');
    if (!body) return;

    let html = '<div class="bg-light p-4 rounded">';
    html += `<h5>${data.soa.soa_number}</h5>`;
    html += `<p><strong>Issue Date:</strong> ${new Date(data.soa.issue_date).toLocaleDateString()}</p>`;
    html += `<p><strong>Status:</strong> ${data.soa.status}</p>`;
    html += `<p><strong>Course:</strong> ${data.trainee?.course || data.soa.course || 'N/A'}</p>`;
    html += `<p><strong>Schedule:</strong> ${data.trainee?.schedule || data.soa.schedule || 'N/A'}</p>`;
    html += '<div class="table-responsive mt-3">';
    html += '<table class="table table-sm"><thead><tr><th>Description</th><th class="text-end">Amount</th></tr></thead><tbody>';

    data.items.forEach(item => {
      const rowClass = item.item_type === 'total' ? 'fw-bold' : '';
      html += `<tr class="${rowClass}"><td>${item.item_name}</td><td class="text-end">₱${parseFloat(item.amount).toFixed(2)}</td></tr>`;
    });

    html += '</tbody></table></div>';
    html += `<div class="mt-3"><strong>Total:</strong> ₱${parseFloat(data.soa.total_amount).toFixed(2)}</div>`;
    html += `<div><strong>Paid:</strong> ₱${parseFloat(data.soa.amount_paid).toFixed(2)}</div>`;
    html += `<div><strong>Balance:</strong> ₱${parseFloat(data.soa.amount_remaining).toFixed(2)}</div>`;
    html += '</div>';

    html += '<div class="mt-4">';
    html += '<h6>Transaction History</h6>';
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      html += '<div class="table-responsive mt-2"><table class="table table-sm"><thead><tr><th>Date</th><th>Description</th><th class="text-end">Amount</th><th>Method</th><th>Recorded By</th></tr></thead><tbody>';
      data.transactions.forEach(tx => {
        html += `<tr>
          <td>${tx.created_at ? new Date(tx.created_at).toLocaleString() : '-'}</td>
          <td>${tx.description || 'Payment recorded'}</td>
          <td class="text-end">₱${parseFloat(tx.amount || 0).toFixed(2)}</td>
          <td>${tx.payment_method || '-'}</td>
          <td>${tx.recorded_by || 'System'}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    } else {
      html += '<div class="no-data mt-2">No transaction history available for this SOA.</div>';
    }
    html += '</div>';

    body.innerHTML = html;
    const soaDownloadBtn = document.getElementById('soa-download-btn');
    if (soaDownloadBtn) {
      soaDownloadBtn.dataset.soaId = data.soa.id;
    }
    const modal = new bootstrap.Modal(document.getElementById('soaDetailsModal'));
    modal.show();
  }

  downloadSOA(soaId) {
    const url = `/api/trainee/soa/${soaId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async loadRequests() {
    try {
      const response = await fetch('/api/trainee/requests', { credentials: 'include' });
      const requests = await response.json();

      let html = '';

      if (requests.length === 0) {
        html = '<div class="no-data"><i class="bi bi-inbox" style="font-size: 48px; margin-bottom: 20px;"></i><p>No active requests</p></div>';
      } else {
        requests.forEach(request => {
          const createdDate = new Date(request.created_at).toLocaleDateString();
          const statusBadge = this.getRequestStatusBadge(request.status);

          html += `<div class="request-card ${request.status === 'released' ? 'released' : ''}">
            <div class="request-header">
              <h5>${request.request_number}</h5>
              ${statusBadge}
            </div>
            <div class="request-details">
              <strong>Type:</strong> ${request.request_type}<br>
              <strong>Submitted:</strong> ${createdDate}<br>
              <strong>Priority:</strong> ${request.priority}
            </div>
            <div class="request-details">
              ${request.request_details}
            </div>
            <button class="btn btn-small btn-view" onclick="trainee.viewRequestDetails(${request.id})" style="margin-top: 10px;">
              View Details & Comments
            </button>
          </div>`;
        });
      }

      document.getElementById('requests-list').innerHTML = html;

    } catch (error) {
      console.error('Error loading requests:', error);
      document.getElementById('requests-list').innerHTML = '<div class="no-data">Error loading requests</div>';
    }
  }

  getRequestStatusBadge(status) {
    const badges = {
      'pending': '<span class="state-badge badge-pending">Pending</span>',
      'in_review': '<span class="state-badge badge-in_review">In Review</span>',
      'ready': '<span class="state-badge badge-ready">Ready</span>',
      'released': '<span class="state-badge badge-released">Released</span>',
      'cancelled': '<span class="state-badge" style="background: #f5f7fa; color: #7f8c8d;">Cancelled</span>'
    };
    return badges[status] || `<span class="state-badge">${status}</span>`;
  }

  async loadPasswordRequests() {
    try {
      const response = await fetch('/api/trainee/password-requests', { credentials: 'include' });
      const requests = await response.json();

      let html = '';

      if (requests.length === 0) {
        html = '<div class="no-data"><i class="bi bi-key" style="font-size: 48px; margin-bottom: 20px;"></i><p>No password change requests</p></div>';
      } else {
        requests.forEach(request => {
          const createdDate = new Date(request.created_at).toLocaleDateString();
          const updatedDate = new Date(request.updated_at).toLocaleDateString();
          const statusBadge = this.getPasswordRequestStatusBadge(request.status);

          let html_content = `<div class="request-card">
            <div class="request-header">
              <h5>${request.request_number}</h5>
              ${statusBadge}
            </div>
            <div class="request-details">
              <strong>Submitted:</strong> ${createdDate}<br>`;

          if (request.status !== 'pending') {
            html_content += `<strong>Last Updated:</strong> ${updatedDate}<br>`;
          }

          if (request.hasNewPassword) {
            html_content += `<strong style="color: #556B2F;">New Password Provided</strong><br>`;
          }

          if (request.response_message) {
            html_content += `<div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <strong>Admin Response:</strong><br>
              ${request.response_message}
            </div>`;
          }

          if (request.status === 'accepted') {
            html_content += `<div style="margin-top: 10px; padding: 10px; background-color: #d4edda; border-radius: 5px; color: #155724;">
              <i class="bi bi-check-circle"></i> Your password has been successfully changed! You can now login with your new password.
            </div>`;
          }

          if (request.status === 'rejected') {
            html_content += `<div style="margin-top: 10px; padding: 10px; background-color: #f8d7da; border-radius: 5px; color: #721c24;">
              <i class="bi bi-x-circle"></i> Your password change request was rejected. Please contact an administrator for more information.
            </div>`;
          }

          html_content += `</div></div>`;
          html += html_content;
        });
      }

      document.getElementById('password-requests-list').innerHTML = html;

    } catch (error) {
      console.error('Error loading password requests:', error);
      document.getElementById('password-requests-list').innerHTML = '<div class="no-data">Error loading password requests</div>';
    }
  }

  getPasswordRequestStatusBadge(status) {
    const badges = {
      'pending': '<span class="state-badge badge-pending">Pending Review</span>',
      'accepted': '<span class="state-badge badge-ready">Approved</span>',
      'rejected': '<span class="state-badge" style="background: #f8d7da; color: #721c24;">Rejected</span>'
    };
    return badges[status] || `<span class="state-badge">${status}</span>`;
  }

  async viewRequestDetails(requestId) {
    try {
      const response = await fetch(`/api/trainee/requests/${requestId}`, { credentials: 'include' });
      const data = await response.json();

      let html = '<div class="bg-light p-4 rounded">';
      html += `<h5>${data.request.request_number}</h5>`;
      html += `<p><strong>Type:</strong> ${data.request.request_type}</p>`;
      html += `<p><strong>Status:</strong> ${data.request.status}</p>`;
      html += `<p>${data.request.request_details}</p>`;

      if (data.attachments && data.attachments.length > 0) {
        html += '<h6 class="mt-3">Attachments:</h6>';
        html += '<ul>';
        data.attachments.forEach(att => {
          const href = att.file_path.startsWith('/') ? att.file_path : `/${att.file_path}`;
          html += `<li><a href="${href}" download="${att.file_name}">${att.file_name}</a></li>`;
        });
        html += '</ul>';
      }

      if (data.comments && data.comments.length > 0) {
        html += '<h6 class="mt-3">Comments:</h6>';
        data.comments.forEach(comment => {
          const commentDate = new Date(comment.created_at).toLocaleDateString();
          html += `<div class="comment" style="margin-bottom: 10px;">
            <strong>${comment.comment_by_name}</strong> <small>(${commentDate})</small>
            <p style="margin-top: 5px;">${comment.comment_text}</p>
          </div>`;
        });
      }

      html += '</div>';

      const modalBody = document.getElementById('request-details-body');
      if (modalBody) {
        modalBody.innerHTML = html;
        const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
        modal.show();
      } else {
        alert(html);
      }
    } catch (error) {
      console.error('Error viewing request:', error);
      alert('Error loading request details');
    }
  }

  async submitRequest() {
    const requestType = document.getElementById('request-type').value;
    const requestDetails = document.getElementById('request-details').value;

    if (!requestType || !requestDetails) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/trainee/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          request_type: requestType,
          request_details: requestDetails
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to submit request');
        return;
      }

      alert('Request submitted successfully! Reference: ' + data.request_number);
      bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
      document.getElementById('request-form').reset();
      this.loadRequests();

    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request');
    }
  }

  async submitCHPay() {
    try {
      const sender = document.getElementById('chpay-sender').value.trim();
      const ref = document.getElementById('chpay-ref').value.trim();
      const details = document.getElementById('chpay-details').value.trim();
      const amount = parseFloat(document.getElementById('chpay-amount').value);
      const fileInput = document.getElementById('chpay-file');

      if (!sender || !ref || !amount || isNaN(amount) || amount <= 0) {
        this.showChpayAlert('Please fill in all required fields', 'danger');
        return;
      }

      const formData = new FormData();
      formData.append('name_of_sender', sender);
      formData.append('reference_number', ref);
      formData.append('details', details);
      formData.append('amount_sent', amount);
      if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('transaction_file', fileInput.files[0]);
      }

      const resp = await fetch('/api/trainee/chpay', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await resp.json();
      if (!resp.ok) {
        this.showChpayAlert(data.error || 'Failed to submit CHPay', 'danger');
        return;
      }

      this.showChpayAlert('✓ CHPay submission received! Reference: ' + data.id, 'success');
      document.getElementById('chpay-form').reset();
      document.getElementById('file-name').textContent = '';
      setTimeout(() => this.loadCHPay(), 1500);
    } catch (error) {
      console.error('Error submitting CHPay:', error);
      this.showChpayAlert('Error submitting CHPay', 'danger');
    }
  }

  async submitChangePassword() {
    const currentPassword = document.getElementById('current-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const alertContainer = document.getElementById('change-password-alert');

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.renderChangePasswordAlert('Please fill in all fields.', 'danger', alertContainer);
      return;
    }

    if (newPassword !== confirmPassword) {
      this.renderChangePasswordAlert('New password and confirmation do not match.', 'danger', alertContainer);
      return;
    }

    try {
      const response = await fetch('/api/trainee/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        this.renderChangePasswordAlert(data.error || 'Unable to update password.', 'danger', alertContainer);
        return;
      }

      this.renderChangePasswordAlert(data.message || 'Password updated successfully.', 'success', alertContainer);
      setTimeout(() => {
        const modalElement = document.getElementById('changePasswordModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }, 1200);
    } catch (error) {
      console.error('Change password error:', error);
      this.renderChangePasswordAlert('Network error. Please try again later.', 'danger', alertContainer);
    }
  }

  renderChangePasswordAlert(message, type, container) {
    if (!container) return;
    const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    container.innerHTML = alertHtml;
  }

  showChpayAlert(message, type) {
    const alertDiv = document.getElementById('chpay-alert');
    if (!alertDiv) return;
    
    const bgColor = type === 'success' ? '#e8f5e9' : '#ffebee';
    const borderColor = type === 'success' ? '#a5d6a7' : '#ef9a9a';
    const textColor = type === 'success' ? '#1b5e20' : '#b71c1c';
    const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill';
    const primaryColor = type === 'success' ? '#556B2F' : '#e74c3c';
    
    alertDiv.innerHTML = `<div style="padding: 14px 16px; border-radius: 7px; background-color: ${bgColor}; border: 2px solid ${borderColor}; color: ${textColor}; font-weight: 500; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(85, 107, 47, 0.08);"><i class="bi bi-${icon}" style="font-size: 18px; color: ${primaryColor};"></i><span>${message}</span></div>`;
    
    if (type === 'success') {
      setTimeout(() => {
        alertDiv.innerHTML = '';
      }, 4000);
    }
  }

  async loadCHPay() {
    try {
      const resp = await fetch('/api/trainee/chpay', { credentials: 'include' });
      if (!resp.ok) {
        document.getElementById('chpay-list').innerHTML = '<div class="no-data" style="padding: 30px; text-align: center;"><i class="bi bi-exclamation-circle" style="font-size: 32px; color: #e74c3c; margin-bottom: 10px; display: block;"></i><p style="color: #7f8c8d;">Failed to load submissions</p></div>';
        return;
      }
      const items = await resp.json();
      if (!Array.isArray(items) || items.length === 0) {
        document.getElementById('chpay-list').innerHTML = '<div class="no-data" style="padding: 30px; text-align: center;"><i class="bi bi-inbox" style="font-size: 32px; color: #556B2F; margin-bottom: 10px; display: block;"></i><p style="color: #7f8c8d;">No CHPay submissions yet</p></div>';
        return;
      }

      let html = '<div class="table-responsive" style="margin: 0;"><table class="table table-hover" style="margin-bottom: 0;"><thead style="background: linear-gradient(135deg, #f5f9f0 0%, #f0f7e8 100%);"><tr><th style="color: #556B2F; font-weight: 700; border: none; padding: 15px 12px;">Date</th><th style="color: #556B2F; font-weight: 700; border: none; padding: 15px 12px;">Reference</th><th style="color: #556B2F; font-weight: 700; border: none; padding: 15px 12px;">Amount</th><th style="color: #556B2F; font-weight: 700; border: none; padding: 15px 12px;">Status</th><th style="color: #556B2F; font-weight: 700; border: none; padding: 15px 12px; text-align: center;">File</th></tr></thead><tbody>';
      items.forEach(it => {
        const date = it.created_at ? new Date(it.created_at).toLocaleString() : '-';
        const fileLink = it.file_path ? `<a href="${it.file_path.startsWith('/') ? it.file_path : '/' + it.file_path}" target="_blank" style="color: #556B2F; text-decoration: none; font-weight: 600;"><i class="bi bi-download" style="margin-right: 5px;"></i>View</a>` : '-';
        const statusClass = `chpay-status-badge chpay-${it.status}`;
        const statusLabel = it.status.charAt(0).toUpperCase() + it.status.slice(1);
        html += `<tr style="border-color: #e8ede0; transition: all 0.2s;"><td style="padding: 15px 12px; vertical-align: middle;"><small style="color: #7f8c8d;">${date}</small></td><td style="padding: 15px 12px; vertical-align: middle;"><strong style="color: #2c3e50;">${it.reference_number}</strong></td><td style="padding: 15px 12px; vertical-align: middle;"><strong style="color: #556B2F;">₱${parseFloat(it.amount_sent).toFixed(2)}</strong></td><td style="padding: 15px 12px; vertical-align: middle;"><span class="${statusClass}">${statusLabel}</span></td><td style="padding: 15px 12px; vertical-align: middle; text-align: center;">${fileLink}</td></tr>`;
      });
      html += '</tbody></table></div>';
      document.getElementById('chpay-list').innerHTML = html;
    } catch (error) {
      console.error('Error loading CHPay:', error);
      document.getElementById('chpay-list').innerHTML = '<div class="no-data" style="padding: 30px; text-align: center;"><i class="bi bi-exclamation-triangle" style="font-size: 32px; color: #e74c3c; margin-bottom: 10px; display: block;"></i><p style="color: #7f8c8d;">Error loading submissions</p></div>';
    }
  }

  async loadNotifications() {
    try {
      const response = await fetch('/api/trainee/notifications', { credentials: 'include' });
      if (!response.ok) return;
      
      const notifications = await response.json();
      this.displayNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  displayNotifications(notifications) {
    const notificationsList = document.getElementById('notifications-list');
    const notificationBadge = document.getElementById('notification-count');
    
    const unreadCount = notifications.filter(n => n.status === 'unread').length;
    
    if (unreadCount > 0) {
      notificationBadge.textContent = unreadCount;
      notificationBadge.style.display = 'flex';
    } else {
      notificationBadge.style.display = 'none';
    }

    // Show toast pop-up for new unread notifications
    notifications.forEach(notif => {
      if (notif.status === 'unread' && !this.shownNotifications.has(notif.id)) {
        this.showNotificationToast(notif);
        this.shownNotifications.add(notif.id);
      }
    });

    if (notifications.length === 0) {
      notificationsList.innerHTML = '<p style="color: #999; margin: 0; padding: 20px; text-align: center;">No notifications</p>';
      return;
    }

    let html = '';
    notifications.forEach(notif => {
      const createdDate = new Date(notif.created_at);
      const timeAgo = this.getTimeAgo(createdDate);
      const unreadClass = notif.status === 'unread' ? 'unread' : '';
      
      html += `
        <div class="notification-item ${unreadClass}" data-id="${notif.id}">
          <div class="notification-item-title">${notif.title}</div>
          <div class="notification-item-message">${notif.message}</div>
          <span class="notification-item-type ${notif.type}">${this.getNotificationTypeLabel(notif.type)}</span>
          <div class="notification-item-time">${timeAgo}</div>
        </div>
      `;
    });
    
    notificationsList.innerHTML = html;

    // Add click handlers to mark as read
    document.querySelectorAll('.notification-item.unread').forEach(item => {
      item.addEventListener('click', () => {
        const notifId = item.dataset.id;
        this.markNotificationAsRead(notifId);
      });
    });
  }

  showNotificationToast(notif) {
    const toastHTML = `
      <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
        <div class="toast-header" style="background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <div style="flex: 1;">
            <strong class="me-auto" style="color: #333;">${notif.title}</strong>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body" style="padding: 12px 16px; color: #555;">
          ${notif.message}
          <div style="font-size: 12px; margin-top: 8px; color: #999;">${this.getNotificationTypeLabel(notif.type)}</div>
        </div>
      </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = toastHTML;
    const toastElement = tempDiv.firstElementChild;
    document.body.appendChild(toastElement);

    const toast = new bootstrap.Toast(toastElement, {
      autohide: true,
      delay: 5000
    });
    
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
    
    return date.toLocaleDateString();
  }

  getNotificationTypeLabel(type) {
    const labels = {
      'payment_rejected': 'Payment Rejected',
      'payment_approved': 'Payment Approved',
      'request_update': 'Request Update',
      'soa_available': 'SOA Available',
      'system': 'System'
    };
    return labels[type] || 'Notification';
  }

  async markNotificationAsRead(notificationId) {
    try {
      await fetch(`/api/trainee/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
      this.loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async clearAllNotifications() {
    try {
      const response = await fetch('/api/trainee/notifications/clear', {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        this.loadNotifications();
        document.getElementById('notification-dropdown').classList.remove('show');
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  async loadAnnouncements() {
    try {
      const response = await fetch('/api/trainee/announcements', { credentials: 'include' });
      const announcements = await response.json();

      if (announcements.length > 0) {
        this.showAnnouncements(announcements);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }

  showAnnouncements(announcements) {
    let html = '';
    
    announcements.forEach(ann => {
      const date = new Date(ann.created_at).toLocaleDateString();
      const priorityColor = ann.priority === 'high' ? '#e74c3c' : (ann.priority === 'medium' ? '#f39c12' : '#3498db');
      const priorityLabel = ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1);
      
      html += `<div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${priorityColor}; background-color: #f8f9fa; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <h6 style="margin: 0; color: #2c3e50; font-weight: 700;">${ann.title}</h6>
          <span style="background-color: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${priorityLabel}</span>
        </div>
        <p style="margin: 0 0 8px 0; color: #555; line-height: 1.5;">${ann.content}</p>
        <small style="color: #999;">${date}</small>
      </div>`;
    });

    document.getElementById('announcement-content').innerHTML = html;

    const modal = new bootstrap.Modal(document.getElementById('announcementModal'));
    modal.show();
  }
}

// Initialize dashboard
const trainee = new TraineeDashboard();
