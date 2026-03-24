import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-container">
      {/* Existing dashboard content */}
      <button className="test-button">Test</button>
    </div>
  );
};

export default Dashboard;

// Styles for the button
const styles = `
  .test-button {
    background-color: red;
    color: white;
    padding: 10px 20px;
    font-size: 16px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 20px;
  }

  .test-button:hover {
    background-color: darkred;
  }
`;

// Inject styles into the document
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}