import React from "react";

interface ModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Confirm Period Log</h3>
        <p>Are you sure you want to log your period for today?</p>
        <div className="modal-buttons">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="confirm-button"
          >
            Yes, log period
          </button>
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
