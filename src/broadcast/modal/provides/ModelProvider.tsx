import { createContext, useState, useMemo, PropsWithChildren, ReactNode } from 'react';
import useModal from '@/broadcast/modal/hooks/useModal';
import { Modal } from '@/broadcast/modal/data/model/type';

const defaultValue: Modal = {
  modalActive: false,
  toggleModal: () => {},
  modalContent: <></>,
  setModalContent: () => {},
  modalProps: undefined,
  setModalProps: () => {},
};

const ModalContext = createContext<Modal>(defaultValue);

function ModalProvider({ children }: PropsWithChildren) {
  const [modalActive, toggleModal] = useModal();
  const [modalContent, setModalContent] = useState<ReactNode>(<></>);
  const [modalProps, setModalProps] = useState<Record<string, any> | undefined>(undefined);

  const value = useMemo(
    () => ({
      modalActive,
      toggleModal,
      modalProps,
      setModalProps,
      modalContent,
      setModalContent,
    }),
    [modalActive, toggleModal, modalProps, modalContent]
  );

  return <ModalContext.Provider value={value}>
    {children}
</ModalContext.Provider>;
}

export default ModalProvider;
export { ModalContext };
