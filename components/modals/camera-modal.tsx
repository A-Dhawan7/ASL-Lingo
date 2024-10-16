"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCameraModal } from "@/store/use-camera-modal";

type CameraModalProps = {
    onConfirm: () => void;
};

export const CameraModal = ({ onConfirm }: CameraModalProps) => {
    const [isClient, setIsClient] = useState(false);
    const { isOpen, close } = useCameraModal();

    useEffect(() => setIsClient(true), []);

    const handleConfirm = () => {
        close();
        onConfirm();
    };

    if (!isClient) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={close}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center w-full justify-center mb-5">
                        <Image
                            src="/camera.svg"
                            alt="Camera"
                            height={100}
                            width={100}
                        />
                    </div>
                    <DialogTitle className="text-center font-bold text-2xl">
                        Webcam Required!
                    </DialogTitle>
                    <DialogDescription >
                        <div className="text-center text-base">
                            You will need a camera and laptop to complete ASL lessons.
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mb-4">
                    <div className="flex flex-col gap-y-4 w-full">
                        <Button variant="primary" className="w-full" size="lg" onClick={handleConfirm}>
                            I understand
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};