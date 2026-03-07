import React from "react";

export default function AdminContactsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full flex flex-col w-full">
            <div className="flex-1 w-full">{children}</div>
        </div>
    );
}
