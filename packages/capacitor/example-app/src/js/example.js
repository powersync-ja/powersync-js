import { PowerSyncDatabase } from '@powersync/capacitor';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    console.log(PowerSyncDatabase, inputValue)
}
