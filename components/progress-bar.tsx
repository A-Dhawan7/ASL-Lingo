import { CircularProgressbarWithChildren } from "react-circular-progressbar";
import { Button } from "@/components/ui/button"; 
import { cn } from "@/lib/utils";
import { Check, Crown, Star } from "lucide-react";

import 'react-circular-progressbar/dist/styles.css';

type ProgressBarProps = {
    percentage: number;
    locked?: boolean;
    isCompleted: boolean;
    Icon: typeof Check | typeof Crown | typeof Star;
};

const ProgressBar = ({ percentage, locked, isCompleted, Icon }: ProgressBarProps) => {
    return (
        <div>
            <CircularProgressbarWithChildren value={Number.isNaN(percentage) ? 0 : percentage}
                styles={{
                    path: {
                        stroke: "#4ade80",
                    },
                    trail: {
                        stroke: "#e5e7eb",
                    },
                }}>
                <Button size="rounded" variant={locked ? "locked" : "secondary"} className="h-[70px] w-[70px] border-b-8">
                    <Icon className={cn(
                        "h-10 w-10",
                        locked
                            ? "fill-neutral-400 text-neutral-400 stroke-neutral-400"
                            : "fill-primary-foreground text-primary-foreground",
                        isCompleted && "fill-none stroke-[4]"
                    )}
                    />
                </Button>
            </CircularProgressbarWithChildren>
        </div>
    );
};

export default ProgressBar;