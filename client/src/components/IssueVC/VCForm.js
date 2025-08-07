import React from 'react';

const VCForm = ({ vcData, onDataChange, loading }) => {
  const handleChange = (field, value) => {
    onDataChange(field, value);
  };

  return (
    <div className="form-section">
      <h4>Credential Details</h4>
      
      <div className="form-group">
        <label htmlFor="credentialType">Credential Type:</label>
        <select
          id="credentialType"
          value={vcData.type}
          onChange={(e) => handleChange('type', e.target.value)}
          disabled={loading}
        >
          <option value="EducationCredential">Education Credential</option>
          <option value="EmploymentCredential">Proof of Employment Credential</option>
          <option value="SkillCredential">Certificate Credential</option>
          <option value="IdentityCredential">Identity Credential</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="subject">Subject/Title *:</label>
        <input
          type="text"
          id="subject"
          value={vcData.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="Ex : Bachelor's Degree in Computer Science"
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="achievement">Achievement or Details:</label>
        <input
          type="text"
          id="achievement"
          value={vcData.achievement}
          onChange={(e) => handleChange('achievement', e.target.value)}
          placeholder="Ex : Graduated with Honors"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={vcData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Additional details about this credential"
          rows="3"
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default VCForm;