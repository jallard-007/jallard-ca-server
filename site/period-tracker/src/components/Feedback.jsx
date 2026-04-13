export function ErrorMsg({ children }) {
    if (!children) return null;
    return (
        <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {children}
        </div>
    );
}

export function SuccessMsg({ children }) {
    if (!children) return null;
    return (
        <div role="status" className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {children}
        </div>
    );
}
