import React from 'react';

const ResultDisplay = ({ type, message }) => {
  if (!message) return null;

  return (
    <div className={`result ${type}`}>
      {message}
    </div>
  );
};

export default ResultDisplay;