export const generateEmailBody = (email: string, otp: string) => `<tbody>
<tr>
  <td height="50"></td>
</tr>
<tr>
  <td align="center" valign="top">
    <table
      width="600"
      cellpadding="0"
      cellspacing="0"
      bgcolor="#ffffff"
      style="border: 1px solid #f1f2f5"
    >
      <tbody>
        <tr>
          <td
            colspan="3"
            height="60"
            bgcolor="#ffffff"
            style="border-bottom: 1px solid #eeeeee; padding-left: 16px"
            align="left"
          >
          </td>
        </tr>
        <tr>
          <td colspan="3" height="20"></td>
        </tr>
        <tr>
          <td width="20"></td>
          <td align="left">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tbody>
                <tr>
                  <td colspan="3" height="20"></td>
                </tr>
                <tr>
                  <td colspan="3">
                    <h4>
                      <span class="il">Reset</span>
                      <span class="il">Password</span>
                    </h4>

                    A <span class="il">password</span>
                    <span class="il">reset</span> event has been triggered.
                    <br /><br />
                    <div><h3>${otp}</h3><span> is your one-time passcode (OTP)</span> </div>

        
                    <br />

                    <table>
                      <tbody>
                        <tr>
                          <td>Email</td>
                          <td>
                            <a
                              href="mailto:${email}"
                              target="_blank"
                              >${email}</a
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td colspan="3" height="20"></td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: center">
                    <span
                      style="
                        font-family: Helvetica, Arial, sans-serif;
                        font-size: 12px;
                        color: #cccccc;
                      "
                      >This message was sent from Genie AI team</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
          <td width="20"></td>
        </tr>
        <tr>
          <td colspan="3" height="20"></td>
        </tr>
      </tbody>
    </table>
  </td>
</tr>
<tr>
  <td height="50"></td>
</tr>
</tbody>
`;
