const Validator = {
    validatePassword: function (password) {
        if (password.length < 6) {
            return { valid: false, message: "Password must be at least 6 characters long." };
        }
        return { valid: true };
    }
};
