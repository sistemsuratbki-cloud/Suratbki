import React from 'react';
import ReactDOM from 'react-dom';

export const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return children;
  return ReactDOM.createPortal(children, document.body);
};
