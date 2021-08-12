const getFileExtension = (file: File) => {
  if (file) {
    const { name } = file;
    if (name.includes(".")) {
      return name
        .substring(name.lastIndexOf(".") + 1, name.length)
        .toLowerCase();
    } else {
      throw new Error("Invalid file extension");
    }
  } else {
    throw new Error("File doesn't exist");
  }
};

export default getFileExtension;
