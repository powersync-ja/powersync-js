import React from "react";
import { loadScript } from "../utils";
function onKeyDownInputHandlers(e) {
  e.stopPropagation();
}
export const FormWrapper = React.forwardRef(function FormWrapper(
  {
    className = "",
    state: initialState = "normal",
    onSubmit,
    children,
    ...props
  },
  ref
) {
  const [state, setState] = React.useState(initialState);
  const formName =
    (children.find((c) => c.type === FormForm)?.props)["data-name"] ?? "Form";
  return React.createElement(
    "div",
    {
      className: className + " w-form",
      ...props,
      ref,
    },
    React.Children.map(children, (child) => {
      if (child.type === FormForm) {
        const style = {};
        if (state === "success") {
          style.display = "none";
        }
        return React.cloneElement(child, {
          ...child.props,
          style,
          onSubmit: (e) => {
            try {
              e.preventDefault();
              if (window.grecaptcha) {
                if (!window.grecaptcha?.getResponse()) {
                  alert(`Please confirm you’re not a robot.`);
                  return;
                }
              }
              if (onSubmit) {
                onSubmit(e);
              }
              setState("success");
            } catch (err) {
              setState("error");
              throw err;
            }
          },
          "aria-label": formName,
        });
      }
      if (child.type === FormSuccessMessage) {
        const style = {};
        if (state === "success") {
          style.display = "block";
        }
        if (state === "error") {
          style.display = "none";
        }
        return React.cloneElement(child, {
          ...child.props,
          style,
          tabIndex: -1,
          role: "region",
          "aria-label": `${formName} success`,
        });
      }
      if (child.type === FormErrorMessage) {
        const style = {};
        if (state === "success") {
          style.display = "none";
        }
        if (state === "error") {
          style.display = "block";
        }
        return React.cloneElement(child, {
          ...child.props,
          tabIndex: -1,
          role: "region",
          "aria-label": `${formName} failure`,
          style,
        });
      }
      return child;
    })
  );
});
export const FormForm = React.forwardRef(function FormForm(props, ref) {
  return React.createElement("form", { ...props, ref });
});
export const FormBlockLabel = React.forwardRef(function FormBlockLabel(
  props,
  ref
) {
  return React.createElement("label", { ...props, ref });
});
export const FormTextInput = React.forwardRef(function FormTextInput(
  { className = "", ...props },
  ref
) {
  return React.createElement("input", {
    ...props,
    className: className + " w-input",
    onKeyDown: onKeyDownInputHandlers,
    ref,
  });
});
export const FormTextarea = React.forwardRef(function FormTextarea(
  { className = "", ...props },
  ref
) {
  return React.createElement("textarea", {
    ...props,
    className: className + " w-input",
    onKeyDown: onKeyDownInputHandlers,
    ref,
  });
});
export const FormInlineLabel = React.forwardRef(function FormInlineLabel(
  { className = "", ...props },
  ref
) {
  return React.createElement("span", {
    className: className + " w-form-label",
    ...props,
    ref,
  });
});
export const FormCheckboxWrapper = React.forwardRef(
  function FormCheckboxWrapper({ className = "", ...props }, ref) {
    return React.createElement("label", {
      className: className + " w-checkbox",
      ...props,
      ref,
    });
  }
);
export const FormRadioWrapper = React.forwardRef(function FormRadioWrapper(
  { className = "", ...props },
  ref
) {
  return React.createElement("label", {
    className: className + " w-radio",
    ...props,
    ref,
  });
});
const HIDE_DEFAULT_INPUT_STYLES = {
  opacity: 0,
  position: "absolute",
  zIndex: -1,
};
const CHECKED_CLASS = "w--redirected-checked";
const FOCUSED_CLASS = "w--redirected-focus";
const FOCUSED_VISIBLE_CLASS = "w--redirected-focus-visible";
export const FormBooleanInput = React.forwardRef(function FormBooleanInput(
  {
    className = "",
    checked = false,
    type = "checkbox",
    inputType,
    customClassName,
    ...props
  },
  ref
) {
  const [isChecked, setIsChecked] = React.useState(checked);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isFocusedVisible, setIsFocusedVisible] = React.useState(false);
  const wasClicked = React.useRef(false);
  const inputProps = {
    checked: isChecked,
    type,
    onChange: (e) => {
      if (props.onChange) props.onChange(e);
      setIsChecked((prevIsChecked) => !prevIsChecked);
    },
    onClick: (e) => {
      if (props.onClick) props.onClick(e);
      wasClicked.current = true;
    },
    onFocus: (e) => {
      if (props.onFocus) props.onFocus(e);
      setIsFocused(true);
      if (!wasClicked.current) {
        setIsFocusedVisible(true);
      }
    },
    onBlur: (e) => {
      if (props.onBlur) props.onBlur(e);
      setIsFocused(false);
      setIsFocusedVisible(false);
      wasClicked.current = false;
    },
    onKeyDown: onKeyDownInputHandlers,
  };
  if (inputType === "custom") {
    const pseudoModeClasses = `${isChecked ? ` ${CHECKED_CLASS}` : ""}${
      isFocused ? ` ${FOCUSED_CLASS}` : ""
    }${isFocusedVisible ? ` ${FOCUSED_CLASS} ${FOCUSED_VISIBLE_CLASS}` : ""} ${
      customClassName ?? ""
    }`;
    const currentClassName = `${className}${pseudoModeClasses}`;
    return (
      <>
        <div className={currentClassName} />
        <input
          ref={ref}
          {...props}
          {...inputProps}
          style={HIDE_DEFAULT_INPUT_STYLES}
        />
      </>
    );
  }
  return <input ref={ref} className={className} {...props} {...inputProps} />;
});
export const FormCheckboxInput = React.forwardRef(function FormCheckboxInput(
  { className = "", ...props },
  ref
) {
  return (
    <FormBooleanInput
      {...props}
      ref={ref}
      type="checkbox"
      className={className + " w-checkbox-input"}
    />
  );
});
export const FormRadioInput = React.forwardRef(function FormRadioInput(
  { className = "", ...props },
  ref
) {
  return (
    <FormBooleanInput
      {...props}
      ref={ref}
      type="radio"
      className={className + " w-radio-input"}
    />
  );
});
const MAX_FILE_SIZE_DEFAULT = 10485760;
const FileUploadContext = React.createContext({
  files: null,
  error: null,
  maxSize: MAX_FILE_SIZE_DEFAULT,
  setFiles: () => undefined,
  setError: () => undefined,
});
export const FormFileUploadWrapper = React.forwardRef(
  function FormFileUploadWrapper(
    { maxSize = MAX_FILE_SIZE_DEFAULT, ...props },
    ref
  ) {
    const [files, setFiles] = React.useState(null);
    const [error, setError] = React.useState(null);
    return React.createElement(
      FileUploadContext.Provider,
      {
        value: { files, setFiles, error, setError, maxSize },
      },
      React.createElement(_FormFileUploadWrapper, { ...props, ref })
    );
  }
);
export const _FormFileUploadWrapper = React.forwardRef(
  function _FormFileUploadWrapper({ className = "", ...props }, ref) {
    return React.createElement("div", {
      className: className + " w-file-upload",
      ...props,
      ref,
    });
  }
);
export const FormFileUploadDefault = React.forwardRef(
  function FormFileUploadDefault({ className = "", ...props }, ref) {
    const { files, error } = React.useContext(FileUploadContext);
    return React.createElement("div", {
      className: className + " w-file-upload-default",
      ...props,
      ref,
      style: {
        ...props.style,
        display: !files || error ? "block" : "none",
      },
    });
  }
);
export const FormFileUploadInput = React.forwardRef(
  function FormFileUploadInput({ className = "", ...props }, ref) {
    const { setFiles, setError, maxSize } = React.useContext(FileUploadContext);
    return React.createElement("input", {
      ...props,
      className: className + " w-file-upload-input",
      type: "file",
      onKeyDown: onKeyDownInputHandlers,
      onChange: (e) => {
        if (e.target.files) {
          if (e.target.files[0] && e.target.files[0].size <= maxSize) {
            setError(null);
            setFiles(e.target.files);
          } else setError("SIZE_ERROR");
        }
      },
      ref,
    });
  }
);
export const FormFileUploadLabel = React.forwardRef(
  function FormFileUploadLabel({ className = "", ...props }, ref) {
    return React.createElement("label", {
      className: className + " w-file-upload-label",
      ...props,
      ref,
    });
  }
);
export const FormFileUploadText = React.forwardRef(function FormFileUploadText(
  { className = "", ...props },
  ref
) {
  return React.createElement("div", {
    className: className + " w-inline-block",
    ...props,
    ref,
  });
});
export const FormFileUploadInfo = React.forwardRef(function FormFileUploadInfo(
  { className = "", ...props },
  ref
) {
  return React.createElement("div", {
    className: className + " w-file-upload-info",
    ...props,
    ref,
  });
});
export const FormFileUploadUploading = React.forwardRef(
  function FormFileUploadUploading({ className = "", ...props }, ref) {
    return React.createElement("div", {
      className: className + " w-file-upload-uploading",
      style: { ...props.style, display: "none" },
      ...props,
      ref,
    });
  }
);
export const FormFileUploadUploadingBtn = React.forwardRef(
  function FormFileUploadUploadingBtn({ className = "", ...props }, ref) {
    return React.createElement("div", {
      className: className + " w-file-upload-uploading-btn",
      ...props,
      ref,
    });
  }
);
export const FormFileUploadUploadingIcon = React.forwardRef(
  function FormFileUploadUploadingIcon({ className = "", ...props }, ref) {
    return React.createElement(
      "svg",
      {
        className: className + " icon w-icon-file-upload-uploading",
        ...props,
        ref,
      },
      <>
        <path
          fill="currentColor"
          opacity=".2"
          d="M15 30a15 15 0 1 1 0-30 15 15 0 0 1 0 30zm0-3a12 12 0 1 0 0-24 12 12 0 0 0 0 24z"
        ></path>
        <path
          fill="currentColor"
          opacity=".75"
          d="M0 15A15 15 0 0 1 15 0v3A12 12 0 0 0 3 15H0z"
        >
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            dur="0.6s"
            from="0 15 15"
            repeatCount="indefinite"
            to="360 15 15"
            type="rotate"
          ></animateTransform>
        </path>
      </>
    );
  }
);
export const FormFileUploadSuccess = React.forwardRef(
  function FormFileUploadSuccess({ className = "", ...props }, ref) {
    const { files, error } = React.useContext(FileUploadContext);
    return React.createElement("div", {
      className: className + " w-file-upload-success",
      ...props,
      ref,
      style: {
        ...props.style,
        display: Boolean(files) && !error ? "block" : "none",
      },
    });
  }
);
export const FormFileUploadFile = React.forwardRef(function FormFileUploadFile(
  { className = "", ...props },
  ref
) {
  return React.createElement("div", {
    className: className + " w-file-upload-file",
    ...props,
    ref,
  });
});
export const FormFileUploadFileName = React.forwardRef(
  function FormFileUploadFileName({ className = "", ...props }, ref) {
    const { files } = React.useContext(FileUploadContext);
    return React.createElement(
      "div",
      {
        className: className + " w-file-upload-file-name",
        ...props,
        ref,
      },
      files && files[0].name
    );
  }
);
export const FormFileUploadRemoveLink = React.forwardRef(
  function FormFileUploadRemoveLink({ className = "", ...props }, ref) {
    const { setFiles } = React.useContext(FileUploadContext);
    return React.createElement("div", {
      className: className + " w-file-remove-link",
      ...props,
      ref,
      onClick: () => {
        setFiles(null);
      },
    });
  }
);
export const FormFileUploadError = React.forwardRef(
  function FormFileUploadError({ className = "", ...props }, ref) {
    const { error } = React.useContext(FileUploadContext);
    return React.createElement("div", {
      className: className + " w-file-upload-error",
      ...props,
      ref,
      style: {
        ...props.style,
        display: error ? "block" : "none",
      },
    });
  }
);
export const FormFileUploadErrorMsg = React.forwardRef(
  function FormFileUploadErrorMsg({ errors, className = "", ...props }, ref) {
    const { error } = React.useContext(FileUploadContext);
    return React.createElement(
      "div",
      {
        className: className + " w-file-upload-error-msg",
        ...props,
        ref,
      },
      errors[error ?? "GENERIC_ERROR"]
    );
  }
);
export const FormButton = React.forwardRef(function FormButton(
  { className = "", value, ...props },
  ref
) {
  return React.createElement("input", {
    ...props,
    ref,
    type: "submit",
    value: value ?? "",
    className: className + " w-button",
    onKeyDown: onKeyDownInputHandlers,
  });
});
export const SearchForm = React.forwardRef(function SearchForm(props, ref) {
  return React.createElement("form", { ...props, ref });
});
export const SearchInput = React.forwardRef(function SearchInput(
  { className = "", ...props },
  ref
) {
  return React.createElement("input", {
    ...props,
    type: "text",
    className: className + " w-input",
    onKeyDown: onKeyDownInputHandlers,
    ref,
  });
});
export const SearchButton = React.forwardRef(function SearchButton(
  { value = "", className = "", ...props },
  ref
) {
  return React.createElement("input", {
    ...props,
    type: "submit",
    value,
    className: className + " w-button",
    onKeyDown: onKeyDownInputHandlers,
    ref,
  });
});
export const FormSuccessMessage = React.forwardRef(function FormSuccessMessage(
  { className = "", ...props },
  ref
) {
  return React.createElement("div", {
    className: className + " w-form-done",
    ...props,
    ref,
  });
});
export const FormErrorMessage = React.forwardRef(function FormErrorMessage(
  { className = "", ...props },
  ref
) {
  return React.createElement("div", {
    className: className + " w-form-fail",
    ...props,
    ref,
  });
});
function hasValue(str) {
  if (typeof str !== "string") return false;
  return str.replace(/^[s ]+|[s ]+$/g, "").length > 0;
}
export const FormSelect = React.forwardRef(function FormSelect(
  { options, className = "", ...props },
  ref
) {
  return React.createElement(
    "select",
    { className: className + " w-select", ...props, ref },
    options.map(({ v, t }, index) =>
      React.createElement(
        "option",
        { key: index, value: hasValue(v) ? v : "" },
        hasValue(t) ? t : ""
      )
    )
  );
});
export const FormReCaptcha = React.forwardRef(function FormReCaptcha(
  { siteKey = "", theme = "light", size = "normal" },
  ref
) {
  React.useEffect(() => {
    loadScript("https://www.google.com/recaptcha/api.js", {
      cacheRegex: /(http|https):\/\/(www)?.+\/recaptcha/,
    });
  }, []);
  return (
    <div
      ref={ref}
      className="g-recaptcha"
      data-sitekey={siteKey}
      data-theme={theme}
      data-size={size}
    />
  );
});
