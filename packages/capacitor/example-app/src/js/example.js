import { PowerSync } from 'powersync';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    PowerSync.echo({ value: inputValue })
}
