// RegisterCoursePage.jsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const RegisterCoursePage = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);

  const curricula = [
    {
      name: "GES",
      description: "Ghana Education Service Curriculum",
      gradient: "from-yellow-400 to-yellow-500",
      packageGradient: "from-yellow-100 to-yellow-200",
    },
    {
      name: "Cambridge",
      description: "Cambridge International Curriculum",
      gradient: "from-blue-400 to-purple-500",
      packageGradient: "from-blue-100 to-purple-100",
    },
  ];

  const curriculumPackagesUI = {
    GES: [
      { code: "EC", name: "Extra Classes", description: "Enhance your learning after school.", duration: "3 months", image:"/packages/extra-classes.png" },
      { code: "HS", name: "Home Tuition", description: "Private lessons at home.", duration: "3 months", image:"/packages/pexels-naomi-shi-374023-1001914.jpg" },
      { code: "VC", name: "Vacation Classes", description: "Learn and have fun during vacations.", duration: "1 months", image:"/packages/pexels-anastasia-shuraeva-8466704.jpg" },
      { code: "SC", name: "Special Classes", description: "Tailored group special classes.",duration: "1 months", image:"/packages/pexels-fauxels-3184468.jpg" },
      { code: "OC", name: "One on One Classes", description: "Personalized learning.", duration: "1 months", image:"/packages/pexels-max-fischer-5212335.jpg" },
      { code: "EPC", name: "Exams Prep Classes", description: "Get ready for exams confidently.", duration: "3 months", image:"/packages/pexels-mikhail-nilov-9159042.jpg" },
      { code: "WC", name: "Weekend Classes", description: "Learn smarter every weekend.", duration: "3 months", image:"/packages/pexels-naomi-shi-374023-1001914.jpg" },
    ],

    Cambridge: [
      { code: "EC", name: "Extra Classes", description: "Additional lessons.", duration: "3 months", image:"/packages/extra-classes.png" },
      { code: "WC", name: "Weekend Classes", description: "Extra weekend learning.", duration: "3 months", image:"/packages/pexels-tima-miroshnichenko-5427648.jpg" },
      { code: "OC", name: "One on One Classes", description: "Personalized teaching.", duration: "1 months", image:"/packages/pexels-max-fischer-5212335.jpg" },
      { code: "EPC", name: "Exams Prep Classes", description: "Extra help for students.", duration: "3 months", image:"/packages/pexels-mikhail-nilov-9159042.jpg" },
      { code: "SC", name: "Special Classes", description: "Special intensive classes.", duration: "1 months", image:"/packages/pexels-fauxels-3184468.jpg" },
    ],
  };  

  const gradeOptionsByCurriculum = {
    GES: ["4", "5-6", "JHS 1-3", "SHS 1-3"],
    Cambridge: ["Stage 4-6", "Stage 7-11", "Stage 12-13"],
  };

  const currentTheme = curricula.find((c) => c.name === selectedCurriculum);

  const makePackageKey = (curriculumName, pkgCode) => {
    const prefix = curriculumName.toUpperCase() === "CAMBRIDGE" ? "CAM" : "GES";
    return `${prefix}-${pkgCode}`;
  };

  const handleCurriculumSelect = (curriculumName) => {
    setSelectedCurriculum(curriculumName);

    if (role === "teacher") {
      const registration = {
        curriculum: curriculumName,
        packageName: "",
        grade: "",
        subjects: [],
      };
      localStorage.setItem("registrationData", JSON.stringify(registration));
      navigate("/auth-form/:role", { state: registration });
    }
  };

  const handlePackageClick = (pkg) => {
    if (!selectedCurriculum || !pkg) return;

    const packageKey = makePackageKey(selectedCurriculum, pkg.code);
    const grades = gradeOptionsByCurriculum[selectedCurriculum] || [];
    const defaultGrade = grades[0] || "";

    const registration = {
      curriculum: selectedCurriculum,
      package: packageKey,
      grade: defaultGrade,
      duration: pkg.duration,
    };

    localStorage.setItem("registrationData", JSON.stringify(registration));
    navigate(`/auth-form/${role}`, { state: registration });
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center py-16 px-4 ${
        selectedCurriculum ? "bg-gray-50" : "bg-gradient-to-b from-cyan-50 to-blue-50"
      }`}
    >
      <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center text-gray-900">
        {!selectedCurriculum
          ? `Select Curriculum (${role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"})`
          : role === "student"
          ? `${selectedCurriculum} Packages`
          : `${selectedCurriculum} Curriculum`}
      </h2>

      {!selectedCurriculum && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-6xl">
          {curricula.map((c) => (
            <div
              key={c.name}
              onClick={() => handleCurriculumSelect(c.name)}
              className={`cursor-pointer w-full h-64 rounded-3xl shadow-xl transform transition-transform hover:scale-105 hover:shadow-2xl bg-gradient-to-br ${c.gradient} flex flex-col justify-center items-center text-white p-6`}
            >
              <h3 className="text-3xl font-extrabold mb-3">{c.name}</h3>
              <p className="text-center text-lg">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {selectedCurriculum && role === "student" && (
        <>
          <button
            onClick={() => setSelectedCurriculum(null)}
            className="px-5 py-2 mb-6 rounded-lg shadow-md font-semibold text-gray-800 hover:bg-gray-300 self-start"
          >
            &larr; Back to Curriculum
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-6xl">
            {curriculumPackagesUI[selectedCurriculum].map((pkg) => (
              <div
                key={pkg.code}
                onClick={() => handlePackageClick(pkg)}
                className={`cursor-pointer bg-gradient-to-br ${currentTheme.packageGradient} rounded-xl shadow-lg hover:scale-105 transform transition-transform overflow-hidden`}
              >
              
                {/* IMAGE DISPLAY FIX */}
                <div className="w-full h-44 overflow-hidden flex items-center justify-center">
                  {pkg.image ? (
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-700 font-medium">{pkg.code}</span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h4 className="text-xl font-bold mb-2 text-gray-800">{pkg.name}</h4>
                  <p className="text-gray-700">{pkg.description}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RegisterCoursePage;
