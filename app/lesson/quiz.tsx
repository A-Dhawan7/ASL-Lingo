"use client"

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import Image from "next/image";
import Confetti from "react-confetti";
import { challengeOptions, challenges, userSubscription } from "@/db/schema";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";
import { Challenge } from "./challenge";
import { Footer } from "./footer";
import { upsertChallengeProgress } from "@/actions/challenge-progress";
import { toast } from "sonner";
import { reduceHearts } from "@/actions/user-progress";
import { useAudio, useWindowSize, useMount } from "react-use";
import { ResultCard } from "./result-card";
import { useRouter } from "next/navigation";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";
import { Button } from "@/components/ui/button";
import ASLDetection from '@/components/asl-detection';

const labelMap: { [key: number]: string } = {
    1: "Hello",
    2: "Yes",
    3: "No",
    4: "Thank you",
    5: "I love you",
};

type Props = {
    initialPercentage: number;
    initialHearts: number;
    initialLessonId: number;
    initialLessonChallenges: (typeof challenges.$inferSelect & {
        completed: boolean;
        challengeOptions: typeof challengeOptions.$inferSelect[];
    })[];
    userSubscription: typeof userSubscription.$inferSelect & {
        isActive: boolean;
    } | null;
};

export const Quiz = ({
    initialPercentage,
    initialHearts,
    initialLessonId,
    initialLessonChallenges,
    userSubscription
}: Props) => {
    const { open: openHeartsModal } = useHeartsModal();
    const { open: openPracticeModal } = usePracticeModal();

    const [isAssistASL, setisAssistASL] = useState<boolean>(false);
    const [showASLDetection, setShowASLDetection] = useState<boolean>(false);
    const [disableButtonASL, setDisableButtonASL] = useState<boolean>(false);
    const [isDisableFooterASL, setisDisableFooterASL] = useState<boolean>(true);

    useMount(() => {
        if (initialPercentage === 100) {
            openPracticeModal();
        }
    });

    const { width, height } = useWindowSize();
    const isScreenLarge = width >= 200 && height >= 200;

    useEffect(() => {
        if (!isScreenLarge) {
            setDisableButtonASL(true);
            setShowASLDetection(false);
        }
    }, [isScreenLarge]);

    const handleButtonClick = () => {
        setShowASLDetection(!showASLDetection);
    };

    const router = useRouter();

    const [finishAudio] = useAudio({ src: "/finish.mp3", autoPlay: true });
    const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
    const [incorrectAudio, _i, incorrectControls] = useAudio({ src: "/incorrect.wav" });

    const [pending, startTransition] = useTransition();

    const [lessonId] = useState(initialLessonId);
    const [hearts, setHearts] = useState(initialHearts);
    const [percentage, setPercentage] = useState(() => {
        return initialPercentage === 100 ? 0 : initialPercentage;
    });

    const challenges = useMemo(() => initialLessonChallenges, [initialLessonChallenges]);
    const [activeIndex, setActiveIndex] = useState(() => {
        const uncompletedIndex = challenges.findIndex((challenge) => !challenge.completed);
        return uncompletedIndex === -1 ? 0 : uncompletedIndex;
    });

    const [selectedOption, setSelectedOption] = useState<number>();
    const [status, setStatus] = useState<"correct" | "wrong" | "none">("none");

    const challenge = challenges[activeIndex];
    const options = useMemo(() => challenge?.challengeOptions ?? [], [challenge]);

    useEffect(() => {
        setisAssistASL(options.length === 0);
    }, [options]);

    const handleCorrect = () => {
        if (status === "correct") {
            return;
        }

        startTransition(() => {
            upsertChallengeProgress(challenge.id)
                .then((response) => {
                    if (response?.error === "hearts") {
                        openHeartsModal();
                        return;
                    }
                    correctControls.play();
                    setStatus("correct");
                    setPercentage((prev) => prev + 100 / challenges.length);

                    if (initialPercentage === 100) {
                        setHearts((prev) => Math.min(prev + 1, 5));
                    }
                })
                .catch(() => toast.error("Something went wrong. Please try again."));
        });
    };

    let debounceTimeout: NodeJS.Timeout;

    const debounceHandleCorrect = () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            handleCorrect();
        }, 16.7);
    };

    const handleIncorrect = () => {
        if (status === "wrong") return;
        startTransition(() => {
            reduceHearts(challenge.id)
                .then((response) => {
                    if (response?.error === "hearts") {
                        openHeartsModal();
                        return;
                    }

                    incorrectControls.play();
                    setStatus("wrong");

                    if (!response?.error) {
                        setHearts((prev) => Math.max(prev - 1, 0));
                    }
                })
                .catch(() => toast.error("Something went wrong. Please try again."))
        });
        return;
    };

    const onNext = () => {
        setActiveIndex((current) => current + 1);
        setDisableButtonASL(false);
        setisDisableFooterASL(true);
    };

    const onContinue = () => {
        if (!selectedOption && !isAssistASL) return;

        if (status === "wrong") {
            setStatus("none");
            setSelectedOption(undefined);
            setDisableButtonASL(false);
            setisDisableFooterASL(true);
            return;
        }
        if (status === "correct") {
            onNext();
            setStatus("none");
            setSelectedOption(undefined);
            setDisableButtonASL(false);
            setisDisableFooterASL(true);
            return;
        }
        const correctOption = options.find((option) => option.correct);
        if (!correctOption) {
            return;
        }

        if (correctOption.id === selectedOption) {
            handleCorrect();
        } else {
            handleIncorrect();
        }
    };

    const onSelect = (id: number) => {
        if (status !== "none") return;
        setSelectedOption(id);
    };

    if (!challenge) {
        return (
            <>
                {finishAudio}
                <Confetti
                    width={width}
                    height={height}
                    recycle={false}
                    numberOfPieces={500}
                    tweenDuration={10000}
                />
                <div className="flex flex-col gap-y-4 lg:gap-y-8 max-w-lg mx-auto text-center items-center justify-center h-full">
                    <Image
                        src="/finish.svg"
                        alt="Finish"
                        className="hidden lg:block"
                        height={100}
                        width={100}
                    />
                    <Image
                        src="/finish.svg"
                        alt="Finish"
                        className="block lg:hidden"
                        height={50}
                        width={50}
                    />
                    <h1 className="text-xl lg:text-3xl font-bold text-neutral-700">
                        Great job! <br /> You&apos;ve completed the lesson.
                    </h1>
                    <div className="flex items-center gap-x-4 w-full">
                        <ResultCard
                            variant="points"
                            value={challenges.length * 10}
                        />
                        <ResultCard
                            variant="hearts"
                            value={hearts}
                        />
                    </div>
                </div>
                <Footer
                    lessonId={lessonId}
                    status="completed"
                    onCheck={() => router.push("/learn")}
                />
            </>
        );
    }

    const onClassIdVerified = (classId: number | null) => {
        if (classId !== null && status === "none") {
            console.log(`onClassIdVerified called with classId: ${classId}`);
            const detectedSign = labelMap[classId];
            if (detectedSign === challenge.question) {
                console.log("Correct ASL sign detected");
                setShowASLDetection(false);
                setDisableButtonASL(true);
                debounceHandleCorrect();
                setisDisableFooterASL(false);
            }
        } else {
            console.log("onClassIdVerified skipped because status is not 'none'");
        }
    };

    const onTimerElapsed = (isElapsed: boolean) => {
        if (isElapsed && status !== "correct") {
            setShowASLDetection(false);
            setDisableButtonASL(true);
            handleIncorrect();
            setisDisableFooterASL(false);
        }
    };

    const title = challenge.type === "ASSIST"
        ? isAssistASL
            ? "Sign the following"
            : "Select the correct meaning"
        : challenge.question;

    return (
        <>
            {incorrectAudio}
            {correctAudio}
            <Header
                hearts={hearts}
                percentage={percentage}
                hasActiveSubscription={!!userSubscription?.isActive}
            />
            <div className="flex-1">
                <div className="h-full flex items-center justify-center">
                    <div className="lg:min-h-[350px] lg:w-[600px] w-full px-6 lg:px-0 flex flex-col gap-y-12">
                        <h1 className="text-lg lg:text-3xl text-center lg:text-start font-bold text-neutral-700">
                            {title}
                        </h1>
                        <div className="relative flex flex-col">
                            {challenge.type === "ASSIST" && isAssistASL ? (
                                <>
                                    <QuestionBubble question={challenge.question} />
                                    <Button
                                        style={{
                                            marginTop: '10px',
                                            zIndex: 3,
                                            position: 'relative',
                                        }}
                                        onClick={handleButtonClick}
                                        variant="super"
                                        className="mb-4 w-[30%] max-w-[200px]"
                                        size={"lg"}
                                        disabled={!isScreenLarge || disableButtonASL}
                                    >
                                        {showASLDetection ? 'Stop Detection' : 'Start Detection'}
                                    </Button>

                                    {showASLDetection && (
                                        <div className="flex justify-end pb-2 mt-[-210px]">
                                            <ASLDetection
                                                key={challenge.id}
                                                onClassIdVerified={onClassIdVerified}
                                                onTimerElapsed={onTimerElapsed}
                                            />
                                        </div>
                                    )}

                                </>
                            ) : (
                                <>
                                    {challenge.type === "ASSIST" && (
                                        <QuestionBubble question={challenge.question} />
                                    )}
                                    <Challenge
                                        options={options}
                                        onSelect={onSelect}
                                        status={status}
                                        selectedOption={selectedOption}
                                        disabled={pending}
                                        type={challenge.type}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer
                disabled={pending || (!selectedOption && isDisableFooterASL)}
                status={status}
                onCheck={onContinue}
            />
        </>
    );
};
