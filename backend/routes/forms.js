const express = require('express');
const router = express.Router();
const formsService = require('../services/formsService');
const { authenticateToken } = require('../middleware/auth');

router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const templates = await formsService.getFormTemplates({ template_type: type });
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching form templates', error: error.message });
  }
});

router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await formsService.getFormTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Form template not found' });
    }
    res.json({ template });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching form template', error: error.message });
  }
});

router.post('/submissions', authenticateToken, async (req, res) => {
  try {
    const { templateId, patientId, lawFirmId, medicalProviderId, formData } = req.body;
    
    if (!templateId || !patientId || !formData) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const submittedByType = req.user.user_type === 'law_firm' ? 'lawfirm' : 
                            req.user.user_type === 'medical_provider' ? 'medical_provider' : 'user';
    
    const submission = await formsService.createFormSubmission({
      templateId,
      patientId,
      lawFirmId: lawFirmId || null,
      medicalProviderId: medicalProviderId || null,
      formData,
      submittedBy: req.user.id,
      submittedByType
    });
    
    res.status(201).json({ message: 'Form created successfully', submission });
  } catch (error) {
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating form submission', error: error.message });
  }
});

router.put('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { formData } = req.body;
    
    if (!formData) {
      return res.status(400).json({ message: 'Missing form data' });
    }
    
    const requestorType = req.user.user_type === 'law_firm' ? 'lawfirm' : 
                          req.user.user_type === 'medical_provider' ? 'medical_provider' : 'user';
    
    const submission = await formsService.updateFormSubmission(
      req.params.id,
      formData,
      req.user.id,
      requestorType
    );
    
    if (!submission) {
      return res.status(404).json({ message: 'Form submission not found' });
    }
    
    res.json({ message: 'Form updated successfully', submission });
  } catch (error) {
    if (error.message === 'Access denied to update this form' || error.message === 'Cannot update a signed form') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating form submission', error: error.message });
  }
});

router.post('/submissions/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { signatureData } = req.body;
    
    if (!signatureData) {
      return res.status(400).json({ message: 'Missing signature data' });
    }
    
    const signature = await formsService.signForm(
      req.params.id,
      req.user.id,
      signatureData,
      req.ip || req.connection.remoteAddress,
      req.get('user-agent')
    );
    
    res.json({ message: 'Form signed successfully', signature });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

router.get('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const requestorType = req.user.user_type === 'law_firm' ? 'lawfirm' : 
                          req.user.user_type === 'medical_provider' ? 'medical_provider' : 'user';
    
    const submission = await formsService.getFormSubmission(
      req.params.id,
      req.user.id,
      requestorType
    );
    
    if (!submission) {
      return res.status(404).json({ message: 'Form submission not found' });
    }
    
    res.json({ submission });
  } catch (error) {
    if (error.message === 'Access denied to this form') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error fetching form submission', error: error.message });
  }
});

router.get('/my-forms', authenticateToken, async (req, res) => {
  try {
    const forms = await formsService.getPatientForms(req.user.id);
    res.json({ forms });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forms', error: error.message });
  }
});

router.delete('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const requestorType = req.user.user_type === 'law_firm' ? 'lawfirm' : 
                          req.user.user_type === 'medical_provider' ? 'medical_provider' : 'user';
    
    await formsService.deleteFormSubmission(
      req.params.id,
      req.user.id,
      requestorType
    );
    
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

module.exports = router;
