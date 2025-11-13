import { Loader as LoaderIcon } from "lucide-react";

const Loader = () => {
  return (
    <div className="flex flex-col-reverse items-center justify-center min-h-screen gap-4">
      Loading...
      <LoaderIcon className="w-7 h-7 text-green-600 animate-spin" />
    </div>
  );
};

export default Loader;
