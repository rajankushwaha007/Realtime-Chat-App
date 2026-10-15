import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const PageBackButton = ({ fallback = "/" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key === "default") {
      navigate(fallback, { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="btn btn-ghost btn-circle btn-sm shrink-0"
      aria-label="Go back"
      title="Go back"
    >
      <ArrowLeft size={22} />
    </button>
  );
};

export default PageBackButton;
