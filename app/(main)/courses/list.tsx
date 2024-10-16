"use client";

import { courses, userProgress } from "@/db/schema";
import { Card } from "./card";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertUserProgress } from "@/actions/user-progress";
import { toast } from "sonner";
import { useCameraModal } from "@/store/use-camera-modal";
import { CameraModal } from "@/components/modals/camera-modal";

type Props = {
    courses: typeof courses.$inferSelect[];
    activeCourseId?: typeof userProgress.$inferSelect.activeCourseId;
};

export const List = ({ courses, activeCourseId }: Props) => {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const { open } = useCameraModal();
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

    const onClick = (id: number) => {
        if (pending) return;

        if (id === activeCourseId) {
            return router.push("/learn");
        }

        const selectedCourse = courses.find(course => course.id === id);

        if (selectedCourse && selectedCourse.title === "ASL") {
            setSelectedCourseId(id);
            open();
        } else {
            startTransition(() => {
                upsertUserProgress(id)
                    .then(() => router.push("/learn"))
                    .catch(() => toast.error("Something went wrong."));
            });
        }
    };

    const handleCameraModalConfirm = () => {
        if (selectedCourseId !== null) {
            startTransition(() => {
                upsertUserProgress(selectedCourseId)
                    .then(() => router.push("/learn"))
                    .catch(() => toast.error("Something went wrong."));
            });
        }
    };

    return (
        <>
            <div className="pt-6 grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
                {courses.map((course) => (
                    <Card
                        key={course.id}
                        id={course.id}
                        title={course.title}
                        imageSrc={course.imageSrc}
                        onClick={() => onClick(course.id)}
                        disabled={pending}
                        active={course.id === activeCourseId}
                    />
                ))}
            </div>
            <CameraModal onConfirm={handleCameraModalConfirm} /> {}
        </>
    );
};
