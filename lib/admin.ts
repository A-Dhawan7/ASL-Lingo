import { auth } from "@clerk/nextjs/server";

const whitelisted = [
    "user_2j2sTvCOWCN5m77i7IIo581XjC8"
];

export const isAdmin = () => {
    const { userId } = auth();
    if(!userId) {
        return false;
    }

    return whitelisted.indexOf(userId) !== -1;
};