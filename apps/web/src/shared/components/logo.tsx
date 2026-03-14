import logo from "../../assets/logo/logo.png";
const Logo = ({size}:{
    size: number
}) => {
  return (
    <img src={logo} alt="Logo" style={{ width: size, height: size }} />
  )
}

export default Logo