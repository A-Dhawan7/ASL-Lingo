import { create } from "zustand";

type CameraModalState = {
    isOpen: boolean;
    open: () => void;
    close: () => void;
};

export const useCameraModal = create<CameraModalState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}));


