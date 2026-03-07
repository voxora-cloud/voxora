"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const checkSetup = async () => {
            try {
                const res = await apiService.checkBootstrapStatus();
                if (res.success && res.data.bootstrapRequired) {
                    router.replace("/setup");
                } else {
                    router.replace("/login");
                }
            } catch (error) {
                console.error("Failed to check start status", error);
                router.replace("/login");
            }
        };

        checkSetup();
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Spinner />
        </div>
    );
}