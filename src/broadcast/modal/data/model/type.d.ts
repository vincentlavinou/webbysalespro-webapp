export interface Modal {
    modalActive: boolean;
    toggleModal: () => void;
    modalContent: ReactNode;
    setModalContent: (content: ReactNode) => void;
    modalProps: Record<string, any> | undefined;
    setModalProps: (props: Record<string, any>) => void;
  }