console.log('Admin dashboard script loaded');

class AdminDashboard {
  constructor() {
    this.currentPage = 'dashboard';
    this.editingStudentId = null;
    this.editingTemplateId = null;
    this.editingAnnouncementId = null;
    this.currentPaymentSOAId = null;
    this.currentRequestFilter = 'all';
    this.currentRequestView = 'student';
    this.currentPasswordFilter = 'all';
    this.init();
  }

  init() {
    this.checkAuth();
    this.setupEventListeners();
    this.loadDashboard();
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      if (!response.ok) {
        window.location.href = '/';
      } else {
        const data = await response.json();
        if (data.userType !== 'admin') {
          window.location.href = '/';
        }
        document.getElementById('user-name').textContent = data.fullName;
      }
    } catch (error) {
      window.location.href = '/';
    }
  }

  setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) {
          this.switchPage(page);
        }
      });
    });

    // Logout buttons
    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
      modal.show();
    });

    document.getElementById('logout-btn-top').addEventListener('click', (e) => {
      e.preventDefault();
      const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
      modal.show();
    });

    document.getElementById('confirm-logout').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/';
    });

    // Student search
    document.getElementById('student-search').addEventListener('input', (e) => {
      this.searchStudents(e.target.value);
    });

    // Request view buttons
    document.querySelectorAll('[data-request-view]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-request-view]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.currentRequestView = button.dataset.requestView;
        this.loadRequests(this.currentRequestFilter);
      });
    });

    // Password requests filter buttons
    document.querySelectorAll('[data-pw-filter]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-pw-filter]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.currentPasswordFilter = button.dataset.pwFilter;
        this.loadPasswordRequests(this.currentPasswordFilter);
      });
    });

    // Report type selection
    const reportType = document.getElementById('report-type');
    const reportMonth = document.getElementById('report-month');
    const reportYear = document.getElementById('report-year');
    
    if (reportType) {
      reportType.addEventListener('change', (e) => {
        if (e.target.value === 'monthly') {
          reportMonth.style.display = 'block';
          reportYear.style.display = 'none';
        } else {
          reportMonth.style.display = 'none';
          reportYear.style.display = 'block';
        }
      });
    }

    // Generate report button
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
      generateReportBtn.addEventListener('click', () => {
        this.generateReport();
      });
    }

    // Export report button
    const exportReportBtn = document.getElementById('export-report-btn');
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', () => {
        this.exportReportToExcel();
      });
    }

    // Save student button
    document.getElementById('save-student-btn').addEventListener('click', () => {
      this.saveStudent();
    });

    // Prepare add student modal when opening
    const studentModal = document.getElementById('studentModal');
    if (studentModal) {
      studentModal.addEventListener('show.bs.modal', () => {
        if (!this.editingStudentId) {
          this.prepareStudentModal('add');
        }
      });

      studentModal.addEventListener('hidden.bs.modal', () => {
        this.editingStudentId = null;
        const saveBtn = document.getElementById('save-student-btn');
        if (saveBtn) saveBtn.style.display = 'inline-block';
        this.setStudentFormReadOnly(false);
        const form = document.getElementById('student-form');
        if (form) form.reset();
        const modalLabel = document.getElementById('studentModalLabel');
        if (modalLabel) modalLabel.textContent = 'Add New Student';
        if (saveBtn) saveBtn.textContent = 'Save Student';
      });
    }

    const templateModal = document.getElementById('templateModal');
    if (templateModal) {
      templateModal.addEventListener('show.bs.modal', () => {
        if (!this.editingTemplateId) {
          this.prepareTemplateModal('add');
        }
      });

      templateModal.addEventListener('hidden.bs.modal', () => {
        this.editingTemplateId = null;
        const saveBtn = document.getElementById('save-template-btn');
        if (saveBtn) saveBtn.style.display = 'inline-block';
        const form = document.getElementById('template-form');
        if (form) form.reset();
        const modalLabel = document.getElementById('templateModalLabel');
        if (modalLabel) modalLabel.textContent = 'New Template';
      });
    }

    const saveTemplateBtn = document.getElementById('save-template-btn');
    if (saveTemplateBtn) {
      saveTemplateBtn.addEventListener('click', () => {
        this.saveTemplate();
      });
    }

    const savePaymentBtn = document.getElementById('save-payment-btn');
    if (savePaymentBtn) {
      savePaymentBtn.addEventListener('click', () => {
        this.savePayment();
      });
    }

    const addSOAItemBtn = document.getElementById('add-soa-item-btn');
    if (addSOAItemBtn) {
      addSOAItemBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.addSOAItemRow();
      });
    }

    const saveSOABtn = document.getElementById('save-soa-btn');
    if (saveSOABtn) {
      saveSOABtn.addEventListener('click', () => {
        this.saveSOA();
      });
    }

    const soaTemplateSelect = document.getElementById('soa-template-select');
    if (soaTemplateSelect) {
      soaTemplateSelect.addEventListener('change', () => {
        this.onSOATemplateChange();
      });
    }

    const soaTraineeSelect = document.getElementById('soa-trainee-select');
    if (soaTraineeSelect) {
      soaTraineeSelect.addEventListener('change', () => {
        this.onSOATraineeChange();
      });
    }

    const soaModal = document.getElementById('soaModal');
    if (soaModal) {
      soaModal.addEventListener('show.bs.modal', () => {
        this.prepareSOAModal();
      });
    }

    // Request filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = btn.dataset.filter;
        this.filterRequests(filter);
      });
    });

    // Announcement modal setup
    const announcementModal = document.getElementById('announcementModal');
    if (announcementModal) {
      announcementModal.addEventListener('show.bs.modal', () => {
        this.prepareAnnouncementModal();
      });

      announcementModal.addEventListener('hidden.bs.modal', () => {
        this.editingAnnouncementId = null;
        const form = document.getElementById('announcement-form');
        if (form) form.reset();
        const modalLabel = document.getElementById('announcementModalLabel');
        if (modalLabel) modalLabel.textContent = 'New Announcement';
      });
    }

    // Save announcement button
    document.getElementById('save-announcement-btn').addEventListener('click', () => {
      this.saveAnnouncement();
    });

    // Announcement audience change
    const audienceSelect = document.getElementById('announcement-audience');
    if (audienceSelect) {
      audienceSelect.addEventListener('change', (e) => {
        const courseDiv = document.getElementById('course-select-div');
        const scheduleDiv = document.getElementById('schedule-select-div');
        if (e.target.value === 'specific_course') {
          courseDiv.style.display = 'block';
          scheduleDiv.style.display = 'none';
        } else if (e.target.value === 'specific_schedule') {
          courseDiv.style.display = 'none';
          scheduleDiv.style.display = 'block';
        } else {
          courseDiv.style.display = 'none';
          scheduleDiv.style.display = 'none';
        }
      });
    }
  }

  switchPage(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
      p.style.display = 'none';
    });

    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
      pageElement.style.display = 'block';
    }

    // Update page title and active nav
    const navLink = document.querySelector(`[data-page="${page}"]`);
    if (navLink) {
      navLink.classList.add('active');
      const pageTitle = {
        'dashboard': 'Dashboard',
        'students': 'Student Management',
        'announcements': 'Announcements',
        'soa-templates': 'SOA Templates',
        'soa': 'Statements of Account',
        'requests': 'Student Requests',
        'password-requests': 'Password Change Requests',
        'chpay': 'CHPay Online',
        'reports': 'Payment Reports'
      };
      document.getElementById('page-title').textContent = pageTitle[page] || page;
    }

    // Load page-specific data
    if (page === 'students') this.loadStudents();
    if (page === 'announcements') this.loadAnnouncements();
    if (page === 'soa-templates') this.loadTemplates();
    if (page === 'soa') this.loadSOAs();
    if (page === 'requests') this.loadRequests(this.currentRequestFilter);
    if (page === 'password-requests') this.loadPasswordRequests(this.currentPasswordFilter);
    if (page === 'chpay') this.loadCHPay();
    if (page === 'reports') this.loadReports();

    this.currentPage = page;
  }

  async loadDashboard() {
    try {
      // Fetch dashboard stats
      const [studentsRes, soasRes, requestsRes] = await Promise.all([
        fetch('/api/admin/trainees'),
        fetch('/api/admin/soa'),
        fetch('/api/admin/requests')
      ]);

      const students = studentsRes.ok ? await studentsRes.json() : [];
      const soas = soasRes.ok ? await soasRes.json() : [];
      const requests = requestsRes.ok ? await requestsRes.json() : [];

      if (!soasRes.ok) {
        console.error('Failed to load SOAs:', soasRes.status, soasRes.statusText);
      }

      // Update stats
      document.getElementById('total-students').textContent = Array.isArray(students) ? students.length : 0;
      document.getElementById('total-soas').textContent = Array.isArray(soas) ? soas.length : 0;
      document.getElementById('pending-requests').textContent = Array.isArray(requests) ? requests.filter(r => r.status === 'pending').length : 0;

      // Calculate outstanding
      const outstanding = Array.isArray(soas)
        ? soas.reduce((sum, soa) => sum + (parseFloat(soa.amount_remaining) || 0), 0)
        : 0;
      document.getElementById('pending-balance').textContent = `₱${outstanding.toFixed(2)}`;

      // Load recent data
      this.loadRecentStudents(students);
      this.loadRecentRequests(requests);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }

  loadRecentStudents(students) {
    const recentStudents = students.slice(0, 5);
    let html = '';

    if (recentStudents.length === 0) {
      html = '<div class="no-data">No students found</div>';
    } else {
      html = '<div class="table-responsive"><table class="table"><thead><tr><th>System ID</th><th>Name</th><th>Course</th><th>Status</th></tr></thead><tbody>';
      recentStudents.forEach(student => {
        html += `<tr>
          <td>${student.system_id}</td>
          <td>${student.first_name} ${student.last_name}</td>
          <td>${student.course}</td>
          <td><span class="badge bg-success">${student.status}</span></td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    document.getElementById('recent-students').innerHTML = html;
  }

  loadRecentRequests(requests) {
    const recentRequests = requests.slice(0, 5);
    let html = '';

    if (recentRequests.length === 0) {
      html = '<div class="no-data">No requests found</div>';
    } else {
      html = '<div class="table-responsive"><table class="table"><thead><tr><th>Request ID</th><th>Type</th><th>Status</th><th>Date</th></tr></thead><tbody>';
      recentRequests.forEach(request => {
        const date = new Date(request.created_at).toLocaleDateString();
        html += `<tr>
          <td>${request.request_number}</td>
          <td>${request.request_type}</td>
          <td><span class="badge bg-warning">${request.status}</span></td>
          <td>${date}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    document.getElementById('recent-requests').innerHTML = html;
  }

  async loadCHPay() {
    try {
      const resp = await fetch('/api/admin/chpay');
      if (!resp.ok) {
        document.getElementById('chpay-content').innerHTML = '<div style="padding: 30px; text-align: center;"><i class="bi bi-exclamation-circle" style="font-size: 32px; color: #e74c3c; margin-bottom: 10px; display: block;"></i><p style="color: #7f8c8d;">Failed to load CHPay submissions</p></div>';
        return;
      }
      const items = await resp.json();
      if (!Array.isArray(items) || items.length === 0) {
        document.getElementById('chpay-content').innerHTML = '<div style="padding: 30px; text-align: center;"><i class="bi bi-inbox" style="font-size: 32px; color: #10572b; margin-bottom: 10px; display: block;"></i><p style="color: #7f8c8d;">No CHPay submissions found</p></div>';
        return;
      }

      let html = '<div class="table-responsive" style="margin: 0;"><table class="table table-hover admin-chpay-table"><thead><tr><th>Date</th><th>Trainee ID</th><th>Trainee Name</th><th>Sender</th><th>Reference</th><th>Amount</th><th>Status</th><th style="text-align: center;">Actions</th></tr></thead><tbody>';
      items.forEach(it => {
        const date = it.created_at ? new Date(it.created_at).toLocaleString() : '-';
        const trainee = it.trainee_name || `${it.first_name} ${it.last_name}` || '-';
        const traineeId = it.system_id || '-';
        const fileLink = it.file_path ? `<a href="${it.file_path.startsWith('/') ? it.file_path : '/' + it.file_path}" target="_blank" style="color: #10572b; text-decoration: none; font-weight: 600; margin-right: 8px;"><i class="bi bi-download"></i> View</a>` : '';
        const statusClass = `admin-chpay-status-badge admin-chpay-${it.status}`;
        const statusLabel = it.status.charAt(0).toUpperCase() + it.status.slice(1);
        
        html += `<tr>
          <td><small style="color: #7f8c8d;">${date}</small></td>
          <td><small style="color: #7f8c8d;">${traineeId}</small></td>
          <td><strong>${trainee}</strong></td>
          <td>${it.name_of_sender}</td>
          <td><strong style="color: #10572b;">${it.reference_number}</strong></td>
          <td><strong style="color: #10572b;">₱${parseFloat(it.amount_sent).toFixed(2)}</strong></td>
          <td><span class="${statusClass}">${statusLabel}</span></td>
          <td style="text-align: center;">
            ${fileLink}
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-sm" style="background-color: #fff3cd; color: #856404; border: none; font-weight: 600; border-radius: 4px; padding: 5px 10px;" onclick="dashboard.updateCHPayStatus(${it.id}, 'verifying')"><i class="bi bi-hourglass-split"></i> Verify</button>
              <button class="btn btn-sm" style="background-color: #d4edda; color: #155724; border: none; font-weight: 600; border-radius: 4px; padding: 5px 10px;" onclick="dashboard.updateCHPayStatus(${it.id}, 'approved')"><i class="bi bi-check-circle"></i> Approve</button>
              <button class="btn btn-sm" style="background-color: #f8d7da; color: #721c24; border: none; font-weight: 600; border-radius: 4px; padding: 5px 10px;" onclick="dashboard.rejectCHPayment(${it.id})"><i class="bi bi-x-circle"></i> Reject</button>
            </div>
          </td>
        </tr>`;
      });
      html += '</tbody></table></div>';
      document.getElementById('chpay-content').innerHTML = html;
    } catch (error) {
      console.error('Error loading CHPay submissions:', error);
      document.getElementById('chpay-content').innerHTML = '<div style="padding: 30px; text-align: center;"><i class="bi bi-exclamation-triangle" style="font-size: 32px; color: #e74c3c; margin-bottom: 10px; display: block;"></i><p style="color: #7f8c8d;">Error loading CHPay submissions</p></div>';
    }
  }

  async updateCHPayStatus(id, status) {
    try {
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      if (!confirm(`Change status to ${statusLabel}?`)) return;
      const resp = await fetch(`/api/admin/chpay/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || 'Failed to update status');
        return;
      }
      alert(`✓ Status updated to ${statusLabel}`);
      this.loadCHPay();
    } catch (error) {
      console.error('Error updating CHPay status:', error);
      alert('Error updating status');
    }
  }

  async rejectCHPayment(id) {
    try {
      if (!confirm('Are you sure you want to reject this payment submission? The trainee will be notified.')) return;
      
      const resp = await fetch(`/api/admin/chpay/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || 'Failed to reject payment');
        return;
      }
      alert('✓ Payment rejected and trainee notified');
      this.loadCHPay();
    } catch (error) {
      console.error('Error rejecting CHPay:', error);
      alert('Error rejecting payment');
    }
  }

  async loadStudents() {
    try {
      const response = await fetch('/api/admin/trainees');
      const students = await response.json();
      this.displayStudents(students);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }

  prepareStudentModal(mode) {
    const modalTitle = document.getElementById('studentModalLabel');
    const saveBtn = document.getElementById('save-student-btn');

    if (mode === 'edit') {
      modalTitle.textContent = 'Edit Student';
      saveBtn.textContent = 'Update Student';
      saveBtn.style.display = 'inline-block';
      this.setStudentFormReadOnly(false);
    } else if (mode === 'view') {
      modalTitle.textContent = 'View Student';
      saveBtn.style.display = 'none';
      this.setStudentFormReadOnly(true);
    } else {
      modalTitle.textContent = 'Add New Student';
      saveBtn.textContent = 'Save Student';
      saveBtn.style.display = 'inline-block';
      this.setStudentFormReadOnly(false);
      document.getElementById('student-form').reset();
      this.editingStudentId = null;
    }
  }

  populateStudentForm(student) {
    document.getElementById('student-system-id').value = student.system_id || '';
    document.getElementById('student-first-name').value = student.first_name || '';
    document.getElementById('student-last-name').value = student.last_name || '';
    document.getElementById('student-contact').value = student.contact_number || '';
    document.getElementById('student-course').value = student.course || '';
    document.getElementById('student-schedule').value = student.schedule || '';
    document.getElementById('student-date-started').value = student.date_started ? student.date_started.split('T')[0] : '';
    document.getElementById('student-email').value = student.email || '';
    document.getElementById('student-address').value = student.address || '';
  }

  setStudentFormReadOnly(readOnly) {
    document.querySelectorAll('#student-form input, #student-form select, #student-form textarea').forEach(el => {
      if (el.id === 'student-system-id') {
        el.readOnly = readOnly;
      } else {
        el.disabled = readOnly;
      }
    });
  }

  getStudentFormData() {
    return {
      system_id: document.getElementById('student-system-id').value.trim(),
      first_name: document.getElementById('student-first-name').value.trim(),
      last_name: document.getElementById('student-last-name').value.trim(),
      contact_number: document.getElementById('student-contact').value.trim(),
      course: document.getElementById('student-course').value,
      schedule: document.getElementById('student-schedule').value,
      date_started: document.getElementById('student-date-started').value,
      email: document.getElementById('student-email').value.trim(),
      address: document.getElementById('student-address').value.trim()
    };
  }

  async displayStudents(students) {
    let html = '<div class="table-responsive"><table class="table"><thead><tr><th>System ID</th><th>Name</th><th>Course</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    if (students.length === 0) {
      html = '<div class="no-data">No students found. <a href="#" onclick="return false;">Add one now</a></div>';
    } else {
      students.forEach(student => {
        html += `<tr>
          <td>${student.system_id}</td>
          <td>${student.first_name} ${student.last_name}</td>
          <td>${student.course}</td>
          <td>${student.contact_number}</td>
          <td><span class="badge bg-${student.status === 'active' ? 'success' : 'secondary'}">${student.status}</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="dashboard.viewStudent(${student.id})">View</button>
            <button class="btn btn-sm btn-warning" onclick="dashboard.editStudent(${student.id})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="dashboard.deleteStudent(${student.id})">Delete</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    document.getElementById('students-table').innerHTML = html;
  }

  async searchStudents(query) {
    try {
      const response = await fetch(`/api/admin/trainees?search=${encodeURIComponent(query)}`);
      const students = await response.json();
      this.displayStudents(students);
    } catch (error) {
      console.error('Error searching students:', error);
    }
  }

  async saveStudent() {
    const systemId = document.getElementById('student-system-id').value;
    const firstName = document.getElementById('student-first-name').value;
    const lastName = document.getElementById('student-last-name').value;
    const contactNumber = document.getElementById('student-contact').value;
    const course = document.getElementById('student-course').value;
    const schedule = document.getElementById('student-schedule').value;
    const dateStarted = document.getElementById('student-date-started').value;
    const email = document.getElementById('student-email').value;
    const address = document.getElementById('student-address').value;

    if (!systemId || !firstName || !lastName || !contactNumber || !course || !schedule || !dateStarted) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        system_id: systemId,
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        course: course,
        schedule: schedule,
        date_started: dateStarted,
        email: email,
        address: address
      };

      const response = await fetch(this.editingStudentId ? `/api/admin/trainees/${this.editingStudentId}` : '/api/admin/trainees', {
        method: this.editingStudentId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to save student');
        return;
      }

      const actionMessage = this.editingStudentId ? 'Student updated successfully!' : 'Student saved successfully!';
      alert(actionMessage);
      const studentModalEl = document.getElementById('studentModal');
      if (studentModalEl) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance
          ? bootstrap.Modal.getOrCreateInstance(studentModalEl)
          : bootstrap.Modal.getInstance(studentModalEl) || new bootstrap.Modal(studentModalEl);
        if (modalInstance && typeof modalInstance.hide === 'function') {
          modalInstance.hide();
        }
      }
      const studentForm = document.getElementById('student-form');
      if (studentForm) studentForm.reset();
      this.editingStudentId = null;
      this.loadStudents();

    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student');
    }
  }

  async deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trainees/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        alert('Failed to delete student');
        return;
      }

      alert('Student deleted successfully');
      this.loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error deleting student');
    }
  }

  async viewStudent(id) {
    try {
      const response = await fetch(`/api/admin/trainees/${id}`);
      if (!response.ok) {
        alert('Unable to load student details');
        return;
      }
      const data = await response.json();
      this.populateStudentForm(data.trainee);
      this.editingStudentId = null;
      this.prepareStudentModal('view');
      const studentModalEl = document.getElementById('studentModal');
      if (studentModalEl) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance
          ? bootstrap.Modal.getOrCreateInstance(studentModalEl)
          : new bootstrap.Modal(studentModalEl);
        if (modalInstance && typeof modalInstance.show === 'function') {
          modalInstance.show();
        }
      }
    } catch (error) {
      console.error('Error viewing student:', error);
      alert('Error loading student details');
    }
  }

  async editStudent(id) {
    try {
      const response = await fetch(`/api/admin/trainees/${id}`);
      if (!response.ok) {
        alert('Unable to load student details');
        return;
      }
      const data = await response.json();
      this.populateStudentForm(data.trainee);
      this.editingStudentId = id;
      this.prepareStudentModal('edit');
      const studentModalEl = document.getElementById('studentModal');
      if (studentModalEl) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance
          ? bootstrap.Modal.getOrCreateInstance(studentModalEl)
          : new bootstrap.Modal(studentModalEl);
        if (modalInstance && typeof modalInstance.show === 'function') {
          modalInstance.show();
        }
      }
    } catch (error) {
      console.error('Error editing student:', error);
      alert('Error loading student details');
    }
  }

  async loadTemplates() {
    try {
      const response = await fetch('/api/admin/soa-templates');
      const templates = await response.json();

      let html = '';
      if (templates.length === 0) {
        html = '<div class="no-data">No templates found. Create one to get started.</div>';
      } else {
        html = '<div class="row">';
        templates.forEach(template => {
          html += `<div class="col-md-6 mb-3">
            <div class="card">
              <div class="card-body">
                <h5>${template.template_name}</h5>
                <p><small>${template.course}</small></p>
                <p>${template.description}</p>
                <button class="btn btn-sm btn-primary" onclick="dashboard.editTemplate(${template.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="dashboard.deleteTemplate(${template.id})">Delete</button>
              </div>
            </div>
          </div>`;
        });
        html += '</div>';
      }

      document.getElementById('templates-content').innerHTML = html;
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async loadSOAs() {
    // TODO: Implement SOA loading
    document.getElementById('soa-content').innerHTML = '<div class="no-data">Loading SOAs...</div>';
  }

  prepareTemplateModal(mode) {
    const modalLabel = document.getElementById('templateModalLabel');
    const saveBtn = document.getElementById('save-template-btn');

    if (mode === 'edit') {
      if (modalLabel) modalLabel.textContent = 'Edit Template';
      if (saveBtn) saveBtn.textContent = 'Update Template';
    } else {
      if (modalLabel) modalLabel.textContent = 'New Template';
      if (saveBtn) saveBtn.textContent = 'Save Template';
      this.editingTemplateId = null;
      const form = document.getElementById('template-form');
      if (form) form.reset();
    }
  }

  populateTemplateForm(template) {
    document.getElementById('template-course').value = template.course || '';
    document.getElementById('template-name').value = template.template_name || '';
    document.getElementById('template-description').value = template.description || '';
  }

  getTemplateFormData() {
    return {
      course: document.getElementById('template-course').value,
      template_name: document.getElementById('template-name').value,
      description: document.getElementById('template-description').value
    };
  }

  async saveTemplate() {
    const formData = this.getTemplateFormData();
    if (!formData.course || !formData.template_name) {
      alert('Please fill in course and template name');
      return;
    }

    try {
      const method = this.editingTemplateId ? 'PUT' : 'POST';
      const url = this.editingTemplateId ? `/api/admin/soa-templates/${this.editingTemplateId}` : '/api/admin/soa-templates';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to save template');
        return;
      }

      alert(this.editingTemplateId ? 'Template updated successfully' : 'Template created successfully');
      const templateModalEl = document.getElementById('templateModal');
      if (templateModalEl) {
        try {
          const modalInstance = bootstrap.Modal.getInstance(templateModalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        } catch (e) {
          console.error('Error hiding modal:', e);
        }
      }

      this.editingTemplateId = null;
      this.loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
  }

  async loadSOAs() {
    try {
      const response = await fetch('/api/admin/soa');
      const soas = await response.json();
      this.displaySOAs(soas);
    } catch (error) {
      console.error('Error loading SOAs:', error);
      document.getElementById('soa-content').innerHTML = '<div class="no-data">Failed to load SOAs</div>';
    }
  }

  async prepareSOAModal() {
    const today = new Date().toISOString().split('T')[0];
    const form = document.getElementById('soa-form');
    if (form) {
      form.reset();
    }
    document.getElementById('soa-issue-date').value = today;
    document.getElementById('soa-due-date').value = '';
    const itemBody = document.querySelector('#soa-items-table tbody');
    if (itemBody) {
      itemBody.innerHTML = '';
    }

    await Promise.all([this.loadSOATrainees(), this.loadSOATemplates()]);
    this.addSOAItemRow();
  }

  async loadSOATrainees() {
    try {
      const response = await fetch('/api/admin/trainees');
      const students = await response.json();
      const select = document.getElementById('soa-trainee-select');
      if (!select) return;
      select.innerHTML = '<option value="">Select Student</option>';
      students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.dataset.course = student.course;
        option.dataset.schedule = student.schedule;
        option.textContent = `${student.system_id} — ${student.first_name} ${student.last_name}`;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading trainees for SOA:', error);
    }
  }

  async loadSOATemplates() {
    try {
      const response = await fetch('/api/admin/soa-templates');
      const templates = await response.json();
      const select = document.getElementById('soa-template-select');
      if (!select) return;
      select.innerHTML = '<option value="">Select Template</option>';
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = `${template.course} — ${template.template_name}`;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading SOA templates:', error);
    }
  }

  async onSOATemplateChange() {
    const selectedTemplateId = document.getElementById('soa-template-select')?.value;
    const tbody = document.querySelector('#soa-items-table tbody');
    if (tbody) tbody.innerHTML = '';

    if (!selectedTemplateId) {
      this.checkForBuiltInCourseItems();
      return;
    }

    try {
      const response = await fetch(`/api/admin/soa-templates/${selectedTemplateId}`);
      if (!response.ok) {
        throw new Error('Unable to load template items');
      }
      const data = await response.json();
      const items = data.items || [];
      const templateCourse = data.template?.course || '';

      if (!items.length) {
        const defaultItems = this.getBuiltInCourseItems(templateCourse);
        if (defaultItems.length) {
          defaultItems.forEach(item => this.addSOAItemRow(item.item_name, item.item_type, item.amount));
        } else {
          this.addSOAItemRow();
        }
      } else {
        const hasValidAmounts = items.some(item => parseFloat(item.amount) > 0);
        if (!hasValidAmounts) {
          const defaultItems = this.getBuiltInCourseItems(templateCourse);
          if (defaultItems.length) {
            defaultItems.forEach(item => this.addSOAItemRow(item.item_name, item.item_type, item.amount));
            this.updateSOATotal();
            return;
          }
        }
        items.forEach(item => {
          this.addSOAItemRow(item.item_name, item.item_type, item.amount);
        });
      }
      this.updateSOATotal();
    } catch (error) {
      console.error('Error loading selected template items:', error);
      this.addSOAItemRow();
      this.updateSOATotal();
    }
  }

  addSOAItemRow(name = '', type = 'tuition', amount = '') {
    const tbody = document.querySelector('#soa-items-table tbody');
    if (!tbody) return;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" class="form-control form-control-sm soa-item-name" value="${name}" placeholder="Item description"></td>
      <td>
        <select class="form-select form-select-sm soa-item-type">
          <option value="tuition" ${type === 'tuition' ? 'selected' : ''}>Tuition</option>
          <option value="miscellaneous" ${type === 'miscellaneous' ? 'selected' : ''}>Miscellaneous</option>
          <option value="discount" ${type === 'discount' ? 'selected' : ''}>Discount</option>
          <option value="other" ${type === 'other' ? 'selected' : ''}>Other</option>
          <option value="total" ${type === 'total' ? 'selected' : ''}>Total</option>
        </select>
      </td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm soa-item-amount" value="${amount ?? ''}" placeholder="0.00"></td>
      <td class="text-center"><button type="button" class="btn btn-sm btn-danger soa-remove-item">Remove</button></td>
    `;
    tbody.appendChild(row);
    const amountInput = row.querySelector('.soa-item-amount');
    amountInput?.addEventListener('input', () => this.updateSOATotal());
    row.querySelector('.soa-remove-item')?.addEventListener('click', () => {
      row.remove();
      this.updateSOATotal();
    });
    this.updateSOATotal();
  }

  onSOATraineeChange() {
    const selectedTemplateId = document.getElementById('soa-template-select')?.value;
    if (selectedTemplateId) {
      return;
    }
    this.checkForBuiltInCourseItems();
  }

  checkForBuiltInCourseItems() {
    const studentSelect = document.getElementById('soa-trainee-select');
    if (!studentSelect) {
      this.addSOAItemRow();
      return;
    }

    const selectedOption = studentSelect.options[studentSelect.selectedIndex];
    const course = selectedOption?.dataset?.course || '';
    const tbody = document.querySelector('#soa-items-table tbody');
    if (tbody) tbody.innerHTML = '';

    const defaultItems = this.getBuiltInCourseItems(course);
    if (defaultItems.length) {
      defaultItems.forEach(item => this.addSOAItemRow(item.item_name, item.item_type, item.amount));
    } else {
      this.addSOAItemRow();
    }
    this.updateSOATotal();
  }

  getBuiltInCourseItems(course) {
    const normalizedCourse = (course || '').toLowerCase();
    if (normalizedCourse.includes('caregiving ncii')) {
      return [
        { item_name: 'Tuition Fee', item_type: 'tuition', amount: 30570 },
        { item_name: 'ID', item_type: 'miscellaneous', amount: 170 },
        { item_name: '2 Sets Scrub Suit', item_type: 'miscellaneous', amount: 1760 },
        { item_name: '2 Sets Polo Shirt', item_type: 'miscellaneous', amount: 900 },
        { item_name: 'Basic Life Support (BLS)', item_type: 'miscellaneous', amount: 2100 },
        { item_name: 'OJT Fee', item_type: 'miscellaneous', amount: 5000 },
        { item_name: 'Graduation Fee', item_type: 'miscellaneous', amount: 1500 },
        { item_name: 'TOR & Certificate Training', item_type: 'miscellaneous', amount: 1800 }
      ];
    }

    if (normalizedCourse.includes('health care services ncii') || normalizedCourse.includes('healthcare services ncii') || normalizedCourse.includes('health care service ncii') || normalizedCourse.includes('health care service') || normalizedCourse.includes('healthcare ncii') || normalizedCourse.includes('healthcare services')) {
      return [
        { item_name: 'Registration Fee', item_type: 'tuition', amount: '' },
        { item_name: 'Tuition Fee', item_type: 'tuition', amount: 34860 },
        { item_name: 'ID', item_type: 'miscellaneous', amount: 170 },
        { item_name: '2 Sets Scrub Suit', item_type: 'miscellaneous', amount: 1760 },
        { item_name: '2 Sets Polo Shirt', item_type: 'miscellaneous', amount: 900 },
        { item_name: 'Basic Life Support (BLS)', item_type: 'miscellaneous', amount: 2100 },
        { item_name: 'OJT Fee', item_type: 'miscellaneous', amount: 5000 },
        { item_name: 'Graduation Fee', item_type: 'miscellaneous', amount: 1500 },
        { item_name: 'TOR & Certificate Training', item_type: 'miscellaneous', amount: 1800 }
      ];
    }

    return [];
  }

  getSOAFormData() {
    const traineeId = document.getElementById('soa-trainee-select')?.value;
    const templateId = document.getElementById('soa-template-select')?.value;
    const issueDate = document.getElementById('soa-issue-date')?.value;
    const dueDate = document.getElementById('soa-due-date')?.value;
    const rows = Array.from(document.querySelectorAll('#soa-items-table tbody tr'));
    const items = rows.map(row => ({
      item_name: row.querySelector('.soa-item-name')?.value.trim() || '',
      item_type: row.querySelector('.soa-item-type')?.value || 'other',
      amount: parseFloat(row.querySelector('.soa-item-amount')?.value) || 0
    })).filter(item => item.item_name);

    return { trainee_id: traineeId, template_id: templateId, issue_date: issueDate, due_date: dueDate, items };
  }

  updateSOATotal() {
    const rows = Array.from(document.querySelectorAll('#soa-items-table tbody tr'));
    const total = rows.reduce((sum, row) => {
      const amountValue = parseFloat(row.querySelector('.soa-item-amount')?.value);
      return sum + (isNaN(amountValue) ? 0 : amountValue);
    }, 0);
    const totalElement = document.getElementById('soa-total-amount');
    if (totalElement) {
      totalElement.textContent = `₱${total.toFixed(2)}`;
    }
  }

  async saveSOA() {
    const soaData = this.getSOAFormData();
    if (!soaData.trainee_id || !soaData.issue_date || soaData.items.length === 0) {
      alert('Please select a student, issue date, and add at least one item.');
      return;
    }

    try {
      const response = await fetch('/api/admin/soa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soaData)
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to create SOA');
        return;
      }
      alert('SOA created successfully');
      const soaModalEl = document.getElementById('soaModal');
      if (soaModalEl) {
        try {
          const modalInstance = bootstrap.Modal.getInstance(soaModalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        } catch (e) {
          console.error('Error hiding SOA modal:', e);
        }
      }
      this.loadSOAs();
    } catch (error) {
      console.error('Error creating SOA:', error);
      alert('Error creating SOA');
    }
  }

  displaySOAs(soas) {
    const content = document.getElementById('soa-content');
    if (!content) return;
    if (!Array.isArray(soas) || soas.length === 0) {
      content.innerHTML = '<div class="no-data">No SOAs found</div>';
      return;
    }

    let html = '<div class="table-responsive"><table class="table table-striped"><thead><tr><th>SOA #</th><th>Student</th><th>Course</th><th>Issue Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    soas.forEach(soa => {
      html += `<tr>
        <td>${soa.soa_number}</td>
        <td>${soa.system_id} — ${soa.first_name} ${soa.last_name}</td>
        <td>${soa.course}</td>
        <td>${soa.issue_date ? new Date(soa.issue_date).toLocaleDateString() : '-'}</td>
        <td>${soa.due_date ? new Date(soa.due_date).toLocaleDateString() : '-'}</td>
        <td>${this.formatCurrency(soa.total_amount)}</td>
        <td>${this.formatCurrency(soa.amount_paid)}</td>
        <td>${this.formatCurrency(soa.amount_remaining)}</td>
        <td>${soa.status || 'draft'}</td>
        <td>
          <button class="btn btn-sm btn-success me-1" onclick="dashboard.recordPayment(${soa.id}, '${soa.soa_number.replace(/'/g, "\'")}', ${parseFloat(soa.amount_paid) || 0})">Receive Payment</button>
          <button class="btn btn-sm btn-info me-1" onclick="dashboard.viewPaymentHistory(${soa.id})">History Payment</button>
          <button class="btn btn-sm btn-secondary me-1" onclick="dashboard.viewSOA(${soa.id})">View</button>
          <button class="btn btn-sm btn-danger" onclick="dashboard.deleteSOA(${soa.id})">Delete</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    content.innerHTML = html;
  }

  formatCurrency(value) {
    return `₱${parseFloat(value || 0).toFixed(2)}`;
  }

  recordPayment(soaId, soaNumber, currentPaid) {
    this.currentPaymentSOAId = soaId;
    document.getElementById('payment-soa-number').textContent = soaNumber;
    document.getElementById('payment-current-paid').textContent = this.formatCurrency(currentPaid);
    const paymentInput = document.getElementById('payment-amount');
    if (paymentInput) {
      paymentInput.value = '';
    }
    const noteInput = document.getElementById('payment-note');
    if (noteInput) {
      noteInput.value = '';
    }
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    paymentModal.show();
  }

  async viewPaymentHistory(soaId) {
    try {
      const response = await fetch(`/api/admin/soa/${soaId}/payments`);
      if (!response.ok) {
        throw new Error('Failed to load payment history');
      }

      const payments = await response.json();
      const content = document.getElementById('payment-history-content');
      if (!content) return;

      if (!Array.isArray(payments) || payments.length === 0) {
        content.innerHTML = '<div class="no-data">No payment history found for this SOA.</div>';
      } else {
        let html = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Description</th><th>Recorded By</th></tr></thead><tbody>';
        payments.forEach(payment => {
          html += `<tr>
            <td>${new Date(payment.created_at).toLocaleString()}</td>
            <td>${this.formatCurrency(payment.amount)}</td>
            <td>${payment.payment_method || 'cash'}</td>
            <td>${payment.description || '-'}</td>
            <td>${payment.recorded_by || 'Admin'}</td>
          </tr>`;
        });
        html += '</tbody></table></div>';
        content.innerHTML = html;
      }

      const modal = new bootstrap.Modal(document.getElementById('paymentHistoryModal'));
      modal.show();
    } catch (error) {
      console.error('Error loading payment history:', error);
      alert('Unable to load payment history.');
    }
  }

  async savePayment() {
    const amountInput = document.getElementById('payment-amount');
    if (!amountInput) {
      return;
    }

    const paymentAmount = parseFloat(amountInput.value);
    const noteInput = document.getElementById('payment-note');
    const paymentNote = noteInput ? noteInput.value.trim() : '';

    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      const response = await fetch(`/api/admin/soa/${this.currentPaymentSOAId}/payment`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_amount: paymentAmount, payment_note: paymentNote })
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to record payment');
        return;
      }

      alert('Payment recorded successfully');
      const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
      if (paymentModal) {
        paymentModal.hide();
      }
      this.loadSOAs();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    }
  }

  async deleteSOA(soaId) {
    if (!confirm('Are you sure you want to delete this SOA? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/soa/${soaId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to delete SOA');
        return;
      }
      alert('SOA deleted successfully');
      this.loadSOAs();
    } catch (error) {
      console.error('Error deleting SOA:', error);
      alert('Error deleting SOA');
    }
  }

  async editTemplate(id) {
    try {
      const response = await fetch(`/api/admin/soa-templates/${id}`);
      if (!response.ok) {
        alert('Unable to load template details');
        return;
      }
      const data = await response.json();
      this.populateTemplateForm(data.template);
      this.editingTemplateId = id;
      this.prepareTemplateModal('edit');
      const templateModalEl = document.getElementById('templateModal');
      if (templateModalEl) {
        try {
          const modalInstance = new bootstrap.Modal(templateModalEl, { focus: true });
          modalInstance.show();
        } catch (e) {
          console.error('Error showing modal:', e);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Error loading template details');
    }
  }

  async deleteTemplate(id) {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/soa-templates/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete template');
        return;
      }

      alert('Template deleted successfully');
      this.loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  }

  async loadRequests(filter = this.currentRequestFilter) {
    try {
      this.currentRequestFilter = filter || 'all';
      document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === this.currentRequestFilter);
      });

      const pageTitle = document.getElementById('requests-page-title');
      if (pageTitle) {
        pageTitle.textContent = this.currentRequestView === 'password' ? 'Password Requests' : 'Student Requests';
      }

      let url = '/api/admin/requests';
      if (this.currentRequestView === 'password') {
        url = '/api/admin/forgot-password-requests';
      }
      if (filter && filter !== 'all') {
        url += `?status=${encodeURIComponent(filter)}`;
      }

      const response = await fetch(url);
      const requests = await response.json();

      let html = '<div class="table-responsive"><table class="table"><thead><tr><th>Request #</th>';
      if (this.currentRequestView === 'student') {
        html += '<th>Student</th><th>Type</th><th>Status</th><th>Priority</th><th>Date</th><th>Actions</th>';
      } else {
        html += '<th>User Type</th><th>Identifier</th><th>Status</th><th>Requested</th><th>Actions</th>';
      }
      html += '</tr></thead><tbody>';

      if (!Array.isArray(requests) || requests.length === 0) {
        html = '<div class="no-data">No requests found</div>';
      } else {
        requests.forEach(request => {
          const date = request.created_at ? new Date(request.created_at).toLocaleDateString() : '-';
          if (this.currentRequestView === 'student') {
            html += `<tr>
              <td>${request.request_number}</td>
              <td>${request.first_name} ${request.last_name}</td>
              <td>${request.request_type}</td>
              <td><span class="badge bg-info">${request.status}</span></td>
              <td><span class="badge bg-${request.priority === 'high' ? 'danger' : 'warning'}">${request.priority}</span></td>
              <td>${date}</td>
              <td>
                <button class="btn btn-sm btn-primary" onclick="dashboard.viewRequest(${request.id})">View</button>
              </td>
            </tr>`;
          } else {
            html += `<tr>
              <td>${request.request_number}</td>
              <td>${request.user_type}</td>
              <td>${request.identifier}</td>
              <td><span class="badge bg-info">${request.status}</span></td>
              <td>${date}</td>
              <td>
                <button class="btn btn-sm btn-primary" onclick="dashboard.viewForgotPasswordRequest(${request.id})">View</button>
              </td>
            </tr>`;
          }
        });
        html += '</tbody></table></div>';
      }

      document.getElementById('requests-content').innerHTML = html;
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }

  async filterRequests(filter) {
    this.currentRequestFilter = filter || 'all';
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    await this.loadRequests(filter);
  }

  async loadPasswordRequests(filter = 'all') {
    try {
      const response = await fetch('/api/admin/forgot-password-requests');
      if (!response.ok) {
        throw new Error('Failed to load password requests');
      }
      let requests = await response.json();

      // Filter based on status
      if (filter !== 'all') {
        requests = requests.filter(r => r.status === filter);
      }

      let html = '<div class="table-responsive"><table class="table table-hover"><thead><tr>';
      html += '<th>Request #</th><th>User Type</th><th>Identifier</th><th>Status</th><th>Requested</th><th>Actions</th>';
      html += '</tr></thead><tbody>';

      if (!Array.isArray(requests) || requests.length === 0) {
        html = '<div class="no-data">No password requests found</div>';
      } else {
        requests.forEach(request => {
          const date = request.created_at ? new Date(request.created_at).toLocaleDateString() : '-';
          html += `<tr>
            <td>${request.request_number}</td>
            <td>${request.user_type}</td>
            <td>${request.identifier}</td>
            <td><span class="badge bg-${request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}">${request.status}</span></td>
            <td>${date}</td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="dashboard.viewForgotPasswordRequest(${request.id})">View</button>
            </td>
          </tr>`;
        });
        html += '</tbody></table></div>';
      }

      document.getElementById('password-requests-content').innerHTML = html;
    } catch (error) {
      console.error('Error loading password requests:', error);
      document.getElementById('password-requests-content').innerHTML = `<div class="alert alert-danger">Error loading password requests</div>`;
    }
  }

  async viewSOA(soaId) {
    try {
      const response = await fetch(`/api/admin/soa/${soaId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load SOA details');
      }
      const data = await response.json();
      this.showSOAModal(data);
    } catch (error) {
      console.error('Error viewing SOA:', error);
      alert(error.message || 'Error loading SOA details');
    }
  }

  showSOAModal(data) {
    const modalBody = document.getElementById('soa-details-body');
    if (!modalBody) return;

    let html = `<div class="mb-3"><strong>SOA Number:</strong> ${data.soa.soa_number}</div>`;
    html += `<div class="mb-3"><strong>Student:</strong> ${data.trainee.system_id} — ${data.trainee.first_name} ${data.trainee.last_name}</div>`;
    html += `<div class="mb-3"><strong>Course:</strong> ${data.trainee.course}</div>`;
    html += `<div class="mb-3"><strong>Issue Date:</strong> ${data.soa.issue_date ? new Date(data.soa.issue_date).toLocaleDateString() : '-'}</div>`;
    html += `<div class="mb-3"><strong>Due Date:</strong> ${data.soa.due_date ? new Date(data.soa.due_date).toLocaleDateString() : '-'}</div>`;
    html += `<div class="mb-3"><strong>Status:</strong> ${data.soa.status || 'draft'}</div>`;
    html += '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Item</th><th>Type</th><th class="text-end">Amount</th></tr></thead><tbody>';
    data.items.forEach(item => {
      html += `<tr><td>${item.item_name}</td><td>${item.item_type}</td><td class="text-end">${this.formatCurrency(item.amount)}</td></tr>`;
    });
    html += '</tbody></table></div>';
    html += `<div class="mt-3"><strong>Total:</strong> ${this.formatCurrency(data.soa.total_amount)}</div>`;
    html += `<div><strong>Paid:</strong> ${this.formatCurrency(data.soa.amount_paid)}</div>`;
    html += `<div><strong>Balance:</strong> ${this.formatCurrency(data.soa.amount_remaining)}</div>`;

    modalBody.innerHTML = html;
    const modal = new bootstrap.Modal(document.getElementById('soaDetailsModal'));
    modal.show();
  }

  async viewRequest(id) {
    try {
      const response = await fetch(`/api/admin/requests/${id}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load request details');
      }
      const data = await response.json();
      this.showRequestModal(data);
    } catch (error) {
      console.error('Error viewing request:', error);
      alert(error.message || 'Error loading request details');
    }
  }

  async viewForgotPasswordRequest(id) {
    try {
      const response = await fetch(`/api/admin/forgot-password-requests/${id}`, { credentials: 'include' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load request details');
      }
      const request = await response.json();
      this.showForgotPasswordRequestModal(request);
    } catch (error) {
      console.error('Error viewing forgot password request:', error);
      alert(error.message || 'Error loading request details');
    }
  }

  showForgotPasswordRequestModal(request) {
    const modalBody = document.getElementById('request-details-body');
    if (!modalBody) return;

    let html = `<div class="mb-3"><strong>Request #:</strong> ${request.request_number}</div>`;
    html += `<div class="mb-3"><strong>User Type:</strong> ${request.user_type}</div>`;
    html += `<div class="mb-3"><strong>Identifier:</strong> ${request.identifier}</div>`;
    html += `<div class="mb-3"><strong>Email:</strong> ${request.email || 'N/A'}</div>`;
    html += `<div class="mb-3"><strong>Status:</strong> <span class="badge bg-${request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}">${request.status}</span></div>`;
    html += `<div class="mb-3"><strong>Submitted:</strong> ${request.created_at ? new Date(request.created_at).toLocaleString() : '-'}</div>`;
    
    // Extract new password from message field if present
    let newPassword = '';
    if (request.message && request.message.includes('New Password:')) {
      const match = request.message.match(/New Password:\s*(.+)/);
      newPassword = match ? match[1].trim() : '';
    }

    if (newPassword) {
      html += `<div class="mb-3"><strong>New Password:</strong> <code>${newPassword}</code></div>`;
    }

    // Show uploaded ID file for trainees
    if (request.user_type === 'trainee' && request.id_file_name) {
      html += `<div class="mb-3"><strong>Valid ID:</strong><br><a href="/api/auth/password-reset-id/${request.id}" class="btn btn-sm btn-info" target="_blank"><i class="bi bi-download"></i> Download ${request.id_file_name}</a></div>`;
    }

    if (request.message && !request.message.includes('New Password:')) {
      html += `<div class="mb-3"><strong>Message:</strong><div class="border rounded p-2">${request.message}</div></div>`;
    }

    if (request.response_message) {
      html += `<div class="mb-3"><strong>Response:</strong><div class="border rounded p-2">${request.response_message}</div></div>`;
      html += `<div class="mb-3"><strong>Handled by:</strong> ${request.responded_by_name || 'System'}</div>`;
    }

    // Only allow action if status is pending
    if (request.status === 'pending') {
      html += '<div class="mb-3"><strong>Action:</strong></div>';
      html += '<div class="btn-group" role="group">';
      html += `<button type="button" class="btn btn-sm btn-success" onclick="dashboard.updateForgotPasswordRequestStatus(${request.id}, 'accepted')">Accept & Change Password</button>`;
      html += `<button type="button" class="btn btn-sm btn-danger" onclick="dashboard.updateForgotPasswordRequestStatus(${request.id}, 'rejected')">Reject</button>`;
      html += '</div>';
      html += '<div class="mt-3"><label class="form-label">Response note (optional)</label><textarea id="forgot-password-response" class="form-control form-control-sm" rows="3" placeholder="Add a short note..."></textarea></div>';
    } else {
      html += `<div class="alert alert-info py-2">This password request has been <strong>${request.status}</strong>.</div>`;
    }

    modalBody.innerHTML = html;
    const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
    modal.show();
  }

  async updateForgotPasswordRequestStatus(requestId, status) {
    try {
      const responseMessage = document.getElementById('forgot-password-response')?.value || null;
      const response = await fetch(`/api/admin/forgot-password-requests/${requestId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, response_message: responseMessage })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update request status');
      }

      alert(`Forgot password request ${status}`);
      this.loadRequests(this.currentRequestFilter);
      const modalElement = document.getElementById('requestDetailsModal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    } catch (error) {
      console.error('Error updating forgot password request status:', error);
      alert(error.message || 'Unable to update request status');
    }
  }

  showRequestModal(data) {
    const modalBody = document.getElementById('request-details-body');
    if (!modalBody) return;

    const request = data.request;
    let html = `<div class="mb-3"><strong>Request #:</strong> ${request.request_number}</div>`;
    html += `<div class="mb-3"><strong>Student:</strong> ${request.system_id} — ${request.first_name} ${request.last_name}</div>`;
    html += `<div class="mb-3"><strong>Type:</strong> ${request.request_type}</div>`;
    html += `<div class="mb-3"><strong>Status:</strong> ${request.status}</div>`;
    html += `<div class="mb-3"><strong>Priority:</strong> ${request.priority}</div>`;
    html += `<div class="mb-3"><strong>Submitted:</strong> ${request.created_at ? new Date(request.created_at).toLocaleString() : '-'}</div>`;
    html += `<div class="mb-3"><strong>Due Date:</strong> ${request.due_date ? new Date(request.due_date).toLocaleDateString() : 'N/A'}</div>`;
    html += `<div class="mb-3"><strong>Assigned To:</strong> ${request.assigned_to_name || 'Unassigned'}</div>`;
    html += `<div class="mb-3"><strong>Details:</strong><div class="border rounded p-2">${request.request_details || '-'}</div></div>`;

    if (Array.isArray(data.attachments) && data.attachments.length > 0) {
      html += '<div class="mb-3"><strong>Attachments:</strong><ul class="list-group">';
      data.attachments.forEach(file => {
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">${file.file_name} <span class="badge bg-secondary">${file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : '-'}</span></li>`;
      });
      html += '</ul></div>';
    }

    if (Array.isArray(data.comments) && data.comments.length > 0) {
      html += '<div class="mb-3"><strong>Comments:</strong><div class="list-group">';
      data.comments.forEach(comment => {
        html += `<div class="list-group-item"><div class="small text-muted">${comment.comment_by_name || 'System'} · ${comment.created_at ? new Date(comment.created_at).toLocaleString() : '-'}</div><div>${comment.comment || '-'}</div></div>`;
      });
      html += '</div></div>';
    }

    html += `<div class="mb-3"><strong>Current Status:</strong> ${request.status}</div>`;
    html += '<div class="mb-3"><strong>Change Status:</strong><div class="btn-group ms-2" role="group">';
    ['pending', 'in_review', 'ready'].forEach(status => {
      html += `<button type="button" class="btn btn-sm ${request.status === status ? 'btn-secondary' : 'btn-outline-secondary'}" onclick="dashboard.updateRequestStatus(${request.id}, '${status}')">${status.replace('_', ' ')}</button>`;
    });
    html += '</div></div>';

    if (request.status === 'ready') {
      html += '<div class="border rounded p-3 mb-3">';
      html += '<h6>Complete Request</h6>';
      html += '<div class="mb-3"><label class="form-label">Upload PDF</label><input type="file" id="request-upload-file" class="form-control form-control-sm" accept="application/pdf"></div>';
      html += `<button type="button" class="btn btn-sm btn-primary mb-3" onclick="dashboard.uploadRequestAttachment(${request.id})">Upload PDF</button>`;
      html += '<div class="mb-3"><label class="form-label">Add Comment</label><textarea id="request-comment-text" class="form-control form-control-sm" rows="3" placeholder="Enter comment..."></textarea></div>';
      html += `<button type="button" class="btn btn-sm btn-primary" onclick="dashboard.addRequestComment(${request.id})">Add Comment</button>`;
      html += '</div>';
    } else {
      html += '<div class="alert alert-info py-2">Set the request to <strong>Ready</strong> to upload PDF files and add comments.</div>';
    }

    modalBody.innerHTML = html;
    const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
    modal.show();
  }

  async updateRequestStatus(requestId, status) {
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update request status');
      }

      alert(`Request status updated to ${status.replace('_', ' ')}`);
      this.loadRequests(this.currentRequestFilter);

      if (status === 'ready') {
        await this.viewRequest(requestId);
      } else {
        const modalElement = document.getElementById('requestDetailsModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      alert(error.message || 'Unable to update request status');
    }
  }

  async uploadRequestAttachment(requestId) {
    try {
      const fileInput = document.getElementById('request-upload-file');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return alert('Please select a PDF file to upload.');
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);

      const response = await fetch(`/api/admin/requests/${requestId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload file');
      }

      alert('PDF uploaded successfully.');
      await this.viewRequest(requestId);
    } catch (error) {
      console.error('Error uploading request attachment:', error);
      alert(error.message || 'Unable to upload file');
    }
  }

  async addRequestComment(requestId) {
    try {
      const commentInput = document.getElementById('request-comment-text');
      if (!commentInput || !commentInput.value.trim()) {
        return alert('Please enter a comment.');
      }

      const response = await fetch(`/api/admin/requests/${requestId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentInput.value.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      alert('Comment added successfully.');
      await this.viewRequest(requestId);
    } catch (error) {
      console.error('Error adding request comment:', error);
      alert(error.message || 'Unable to add comment');
    }
  }

  loadReports() {
    // Set current month/year as default
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    document.getElementById('report-month').value = currentMonth;
    document.getElementById('report-year').value = today.getFullYear();
    document.getElementById('report-content').innerHTML = '';
    document.getElementById('export-report-btn').style.display = 'none';
  }

  async generateReport() {
    try {
      const reportType = document.getElementById('report-type').value;
      const reportMonth = document.getElementById('report-month').value;
      const reportYear = document.getElementById('report-year').value;

      if (!reportMonth && reportType === 'monthly') {
        alert('Please select a month');
        return;
      }
      if (!reportYear && reportType === 'yearly') {
        alert('Please select a year');
        return;
      }

      const reportContent = document.getElementById('report-content');
      reportContent.innerHTML = `
        <div style="padding:30px; text-align:center;">
          <i class="bi bi-hourglass-split" style="font-size:32px; color:var(--accent); margin-bottom:10px; display:block;"></i>
          <p class="muted">Generating ${reportType} payment report...</p>
        </div>
      `;

      const params = new URLSearchParams();
      params.append('type', reportType);
      if (reportType === 'monthly') {
        params.append('month', reportMonth);
      } else {
        params.append('year', reportYear);
      }

      const response = await fetch(`/api/admin/payment-report?${params}`, { credentials: 'include' });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      const data = await response.json();
      this.displayReport(data, reportType);
      document.getElementById('export-report-btn').style.display = 'inline-block';
    } catch (error) {
      console.error('Error generating report:', error);
      document.getElementById('report-content').innerHTML = `
        <div class="alert alert-danger">Error generating report: ${error.message}</div>
      `;
    }
  }

  displayReport(data, reportType) {
    const reportContent = document.getElementById('report-content');
    const period = reportType === 'monthly' 
      ? new Date(document.getElementById('report-month').value + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })
      : document.getElementById('report-year').value;

    let html = `
      <div class="mt-4">
        <h5>Payment Report - ${period}</h5>
        <small class="text-muted">Report Type: ${reportType === 'monthly' ? 'Monthly' : 'Yearly'}</small>
        
        <div class="table-responsive mt-3">
          <table class="table table-hover table-bordered">
            <thead class="table-light">
              <tr>
                <th>Payment Method</th>
                <th class="text-end">Count</th>
                <th class="text-end">Total Amount</th>
                <th class="text-end">Average Amount</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (data.summary && data.summary.length > 0) {
      let grandTotal = 0;
      let totalCount = 0;
      
      data.summary.forEach(item => {
        const average = item.count > 0 ? (item.total / item.count).toFixed(2) : 0;
        grandTotal += item.total;
        totalCount += item.count;
        
        html += `
          <tr>
            <td>${item.payment_method || 'Unknown'}</td>
            <td class="text-end">${item.count}</td>
            <td class="text-end">${this.formatCurrency(item.total)}</td>
            <td class="text-end">${this.formatCurrency(average)}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
            <tfoot class="table-light">
              <tr>
                <th>Total</th>
                <th class="text-end"><strong>${totalCount}</strong></th>
                <th class="text-end"><strong>${this.formatCurrency(grandTotal)}</strong></th>
                <th class="text-end"><strong>${this.formatCurrency(grandTotal / totalCount)}</strong></th>
              </tr>
            </tfoot>
          </table>
        </div>
      `;

      // Statistics cards
      html += `
        <div class="row mt-4">
          <div class="col-md-4">
            <div class="card bg-light">
              <div class="card-body text-center">
                <h6 class="card-title text-muted">Total Payments</h6>
                <h3 class="card-text" style="color:var(--accent);">${totalCount}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-light">
              <div class="card-body text-center">
                <h6 class="card-title text-muted">Total Amount</h6>
                <h3 class="card-text" style="color:var(--accent);">${this.formatCurrency(grandTotal)}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-light">
              <div class="card-body text-center">
                <h6 class="card-title text-muted">Average Payment</h6>
                <h3 class="card-text" style="color:var(--accent);">${this.formatCurrency(grandTotal / totalCount)}</h3>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
            <tr>
              <td colspan="4" class="text-center py-4 text-muted">No payment data available for this period</td>
            </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    reportContent.innerHTML = html;
  }

  exportReportToExcel() {
    try {
      const reportType = document.getElementById('report-type').value;
      const reportMonth = document.getElementById('report-month').value;
      const reportYear = document.getElementById('report-year').value;

      const params = new URLSearchParams();
      params.append('type', reportType);
      params.append('export', 'excel');
      
      if (reportType === 'monthly') {
        params.append('month', reportMonth);
      } else {
        params.append('year', reportYear);
      }

      window.location.href = `/api/admin/payment-report?${params}`;
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    }
  }

  async loadAnnouncements() {
    try {
      const response = await fetch('/api/admin/announcements', { credentials: 'include' });
      const announcements = await response.json();

      let html = '';
      if (announcements.length === 0) {
        html = '<div class="no-data"><i class="bi bi-info-circle" style="font-size:32px; margin-bottom:10px;"></i><p>No announcements yet. Create one to get started!</p></div>';
      } else {
        html = '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>Title</th><th>Priority</th><th>Audience</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
        
        announcements.forEach(ann => {
          const date = new Date(ann.created_at).toLocaleDateString();
          const priorityColor = ann.priority === 'high' ? 'danger' : (ann.priority === 'medium' ? 'warning' : 'info');
          const audienceLabel = ann.target_audience === 'specific_course' ? ann.target_course : (ann.target_audience === 'specific_schedule' ? ann.target_schedule : 'All');
          
          html += `<tr>
            <td><strong>${ann.title}</strong></td>
            <td><span class="badge bg-${priorityColor}">${ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}</span></td>
            <td>${ann.target_audience === 'all' ? 'All Trainees' : audienceLabel}</td>
            <td>${date}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="dashboard.editAnnouncement(${ann.id})"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-danger" onclick="dashboard.deleteAnnouncement(${ann.id})"><i class="bi bi-trash"></i></button>
            </td>
          </tr>`;
        });
        
        html += '</tbody></table></div>';
      }

      document.getElementById('announcements-content').innerHTML = html;
    } catch (error) {
      console.error('Error loading announcements:', error);
      document.getElementById('announcements-content').innerHTML = '<div class="no-data">Failed to load announcements</div>';
    }
  }

  prepareAnnouncementModal() {
    const form = document.getElementById('announcement-form');
    if (form) form.reset();
    const modalLabel = document.getElementById('announcementModalLabel');
    if (modalLabel) modalLabel.textContent = 'New Announcement';
    document.getElementById('announcement-audience').value = 'all';
    const courseDiv = document.getElementById('course-select-div');
    const scheduleDiv = document.getElementById('schedule-select-div');
    if (courseDiv) courseDiv.style.display = 'none';
    if (scheduleDiv) scheduleDiv.style.display = 'none';
  }

  async saveAnnouncement() {
    const title = document.getElementById('announcement-title').value.trim();
    const content = document.getElementById('announcement-content').value.trim();
    const priority = document.getElementById('announcement-priority').value;
    const audience = document.getElementById('announcement-audience').value;
    const course = document.getElementById('announcement-course').value;
    const schedule = document.getElementById('announcement-schedule').value;

    if (!title || !content) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const method = this.editingAnnouncementId ? 'PUT' : 'POST';
      const url = this.editingAnnouncementId 
        ? `/api/admin/announcements/${this.editingAnnouncementId}`
        : '/api/admin/announcements';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          content,
          priority,
          target_audience: audience,
          target_course: audience === 'specific_course' ? course : null,
          target_schedule: audience === 'specific_schedule' ? schedule : null
        })
      });

      if (!response.ok) throw new Error('Failed to save announcement');

      const modalEl = document.getElementById('announcementModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      this.loadAnnouncements();
      alert(this.editingAnnouncementId ? 'Announcement updated successfully' : 'Announcement created successfully');
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Failed to save announcement');
    }
  }

  async editAnnouncement(id) {
    try {
      const response = await fetch(`/api/admin/announcements`, { credentials: 'include' });
      const announcements = await response.json();
      const ann = announcements.find(a => a.id === id);

      if (!ann) return;

      this.editingAnnouncementId = id;
      document.getElementById('announcement-title').value = ann.title;
      document.getElementById('announcement-content').value = ann.content;
      document.getElementById('announcement-priority').value = ann.priority;
      document.getElementById('announcement-audience').value = ann.target_audience;
      
      if (ann.target_audience === 'specific_course') {
        document.getElementById('announcement-course').value = ann.target_course;
        document.getElementById('course-select-div').style.display = 'block';
        document.getElementById('schedule-select-div').style.display = 'none';
      } else if (ann.target_audience === 'specific_schedule') {
        document.getElementById('announcement-schedule').value = ann.target_schedule;
        document.getElementById('course-select-div').style.display = 'none';
        document.getElementById('schedule-select-div').style.display = 'block';
      } else {
        document.getElementById('course-select-div').style.display = 'none';
        document.getElementById('schedule-select-div').style.display = 'none';
      }

      const modalLabel = document.getElementById('announcementModalLabel');
      if (modalLabel) modalLabel.textContent = 'Edit Announcement';

      const modal = new bootstrap.Modal(document.getElementById('announcementModal'));
      modal.show();
    } catch (error) {
      console.error('Error loading announcement:', error);
      alert('Failed to load announcement');
    }
  }

  async deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete announcement');

      this.loadAnnouncements();
      alert('Announcement deleted successfully');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  }
}

// Initialize dashboard
const dashboard = new AdminDashboard();
